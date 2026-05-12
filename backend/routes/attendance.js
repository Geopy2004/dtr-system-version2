import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const TIME_ZONE = process.env.ATTENDANCE_TIME_ZONE || "Asia/Singapore";
const LATE_CUTOFF_HOUR = Number(process.env.ATTENDANCE_LATE_HOUR || 8);
const LATE_CUTOFF_MINUTE = Number(process.env.ATTENDANCE_LATE_MINUTE || 0);
const MAX_NOTES_LENGTH = 500;
const MAX_LOCATION_LENGTH = 160;
const MAX_ATTENDANCE_LIMIT = 100;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase backend environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sendServerError(res, publicMessage = "Server error") {
  return res.status(500).json({ message: publicMessage });
}

function parseBearerToken(authHeader) {
  if (typeof authHeader !== "string") return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getRequestSupabase(req) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabase;
  }

  const token = parseBearerToken(req.headers.authorization);

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function isValidDateParam(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && value === parsed.toISOString().slice(0, 10);
}

function normalizeOptionalText(value, fieldName, maxLength) {
  if (value == null) return { value: "" };
  if (typeof value !== "string") {
    return { error: `${fieldName} must be text` };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer` };
  }

  return {
    value: [...trimmed]
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || code >= 32;
      })
      .join(""),
  };
}

function getValidatedRangeQuery(query) {
  const { startDate, endDate, limit } = query;
  const parsedLimit = Number.parseInt(limit, 10);

  if (startDate && !isValidDateParam(startDate)) {
    return { error: "Invalid start date" };
  }

  if (endDate && !isValidDateParam(endDate)) {
    return { error: "Invalid end date" };
  }

  if (startDate && endDate && startDate > endDate) {
    return { error: "Start date cannot be after end date" };
  }

  if (limit && (!Number.isInteger(parsedLimit) || parsedLimit <= 0)) {
    return { error: "Invalid limit" };
  }

  return {
    startDate,
    endDate,
    limit: Number.isInteger(parsedLimit)
      ? Math.min(parsedLimit, MAX_ATTENDANCE_LIMIT)
      : undefined,
  };
}

function getTimeParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function getAttendanceDate(date) {
  const parts = getTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getStatus(timeIn) {
  const parts = getTimeParts(new Date(timeIn));
  const hours = Number(parts.hour);
  const minutes = Number(parts.minute);
  const lateMinutes =
    (hours - LATE_CUTOFF_HOUR) * 60 + (minutes - LATE_CUTOFF_MINUTE);

  if (lateMinutes > 0) {
    return { status: "late", late_minutes: lateMinutes };
  }

  return { status: "present", late_minutes: 0 };
}

function calculateHoursWorked(timeIn, timeOut) {
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Number((diffMs / 1000 / 60 / 60).toFixed(2));
}

function calculateSplitHours(record, fallbackTimeOut) {
  const morningHours =
    record.morning_time_in && record.lunch_time_out
      ? calculateHoursWorked(record.morning_time_in, record.lunch_time_out)
      : 0;
  const afternoonHours =
    record.lunch_time_in && fallbackTimeOut
      ? calculateHoursWorked(record.lunch_time_in, fallbackTimeOut)
      : 0;

  if (morningHours || afternoonHours) {
    return Number((morningHours + afternoonHours).toFixed(2));
  }

  return calculateHoursWorked(record.time_in, fallbackTimeOut);
}

function buildStats(records) {
  return {
    total_days: records.length,
    present: records.filter((record) => record.status === "present").length,
    late: records.filter((record) => record.status === "late").length,
    absent: records.filter((record) => record.status === "absent").length,
    half_day: records.filter(
      (record) => record.status === "half-day" || record.status === "halfday"
    ).length,
    total_late_minutes: records.reduce(
      (sum, record) => sum + (Number(record.late_minutes) || 0),
      0
    ),
    total_hours: Number(
      records
        .reduce((sum, record) => sum + (Number(record.hours_worked) || 0), 0)
        .toFixed(2)
    ),
  };
}

function getMissingSchemaColumn(error) {
  if (error?.code !== "PGRST204") return null;

  const match = error.message?.match(/'([^']+)' column/);
  return match?.[1] || null;
}

async function runWithSchemaFallback(createQuery, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < Object.keys(payload).length + 1; attempt += 1) {
    const { data, error } = await createQuery(nextPayload);

    if (!error) return data;

    const missingColumn = getMissingSchemaColumn(error);

    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error;
    }

    nextPayload = Object.fromEntries(
      Object.entries(nextPayload).filter(([key]) => key !== missingColumn)
    );
  }

  throw new Error("Attendance schema does not match the required fields.");
}

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = parseBearerToken(authHeader);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    req.supabase = getRequestSupabase(req);
    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

async function timeIn(req, res) {
  try {
    const locationResult = normalizeOptionalText(
      req.body?.location,
      "Location",
      MAX_LOCATION_LENGTH
    );
    const notesResult = normalizeOptionalText(
      req.body?.notes,
      "Notes",
      MAX_NOTES_LENGTH
    );

    if (locationResult.error || notesResult.error) {
      return res
        .status(400)
        .json({ message: locationResult.error || notesResult.error });
    }

    const location = locationResult.value;
    const notes = notesResult.value;
    const userId = req.user.id;
    const now = new Date();
    const today = getAttendanceDate(now);

    const { data: existing, error: existingError } = await req.supabase
      .from("attendance")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return res.status(400).json({ message: "Already timed in today" });
    }

    const { status, late_minutes } = getStatus(now);

    const data = await runWithSchemaFallback(
      (payload) =>
        req.supabase
          .from("attendance")
          .insert([payload])
          .select()
          .single(),
      {
        user_id: userId,
        date: today,
        time_in: now.toISOString(),
        morning_time_in: now.toISOString(),
        location,
        notes,
        status,
        late_minutes,
        hours_worked: 0,
      }
    );

    return res.status(201).json({ message: "Time in recorded", attendance: data });
  } catch (err) {
    console.error("Time in error:", err);
    return sendServerError(res);
  }
}

async function getTodayRecord(req, userId, today) {
  const { data: existing, error: fetchError } = await req.supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (fetchError) throw fetchError;
  return existing;
}

async function updateTodayAttendance(
  req,
  res,
  payload,
  message,
  recordedAt,
  validateExisting
) {
  try {
    const userId = req.user.id;
    const today = getAttendanceDate(recordedAt);
    const existing = await getTodayRecord(req, userId, today);

    if (!existing) {
      return res
        .status(400)
        .json({ message: "No time in record found for today" });
    }

    const validationMessage = validateExisting?.(existing);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const data = await runWithSchemaFallback(
      (nextPayload) =>
        req.supabase
          .from("attendance")
          .update(nextPayload)
          .eq("id", existing.id)
          .select()
          .single(),
      payload
    );

    return res.json({ message, attendance: data });
  } catch (err) {
    console.error(`${message} error:`, err);
    return sendServerError(res);
  }
}

async function lunchOut(req, res) {
  const now = new Date();
  return updateTodayAttendance(
    req,
    res,
    {
      lunch_time_out: now.toISOString(),
    },
    "Lunch out recorded",
    now,
    (existing) =>
      existing.lunch_time_out ? "Already timed out for lunch" : null
  );
}

async function lunchIn(req, res) {
  const now = new Date();
  return updateTodayAttendance(
    req,
    res,
    {
      lunch_time_in: now.toISOString(),
    },
    "Lunch in recorded",
    now,
    (existing) => {
      if (!existing.lunch_time_out) return "Record lunch out first";
      if (existing.lunch_time_in) return "Already timed in after lunch";
      return null;
    }
  );
}

async function timeOut(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = getAttendanceDate(now);
    const existing = await getTodayRecord(req, userId, today);

    if (!existing) {
      return res
        .status(400)
        .json({ message: "No time in record found for today" });
    }

    if (existing.time_out) {
      return res.status(400).json({ message: "Already timed out today" });
    }

    if (existing.lunch_time_out && !existing.lunch_time_in) {
      return res.status(400).json({ message: "Record lunch in first" });
    }

    const hoursWorked = calculateSplitHours(existing, now);

    const data = await runWithSchemaFallback(
      (payload) =>
        req.supabase
          .from("attendance")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      {
        time_out: now.toISOString(),
        afternoon_time_out: now.toISOString(),
        hours_worked: hoursWorked,
      }
    );

    return res.json({ message: "Time out recorded", attendance: data });
  } catch (err) {
    console.error("Time out error:", err);
    return sendServerError(res);
  }
}

async function getMyAttendance(req, res) {
  try {
    const userId = req.user.id;
    const validatedQuery = getValidatedRangeQuery(req.query);

    if (validatedQuery.error) {
      return res.status(400).json({ message: validatedQuery.error });
    }

    let query = req.supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (validatedQuery.startDate) {
      query = query.gte("date", validatedQuery.startDate);
    }
    if (validatedQuery.endDate) {
      query = query.lte("date", validatedQuery.endDate);
    }
    if (validatedQuery.limit) {
      query = query.limit(validatedQuery.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const attendance = data || [];

    return res.json({
      attendance,
      stats: buildStats(attendance),
    });
  } catch (err) {
    console.error("Get attendance error:", err);
    return sendServerError(res);
  }
}

router.post("/timein", requireAuth, timeIn);
router.post("/time-in", requireAuth, timeIn);
router.post("/morning-in", requireAuth, timeIn);
router.post("/lunch-out", requireAuth, lunchOut);
router.post("/lunch-in", requireAuth, lunchIn);
router.post("/timeout", requireAuth, timeOut);
router.post("/time-out", requireAuth, timeOut);
router.post("/afternoon-out", requireAuth, timeOut);
router.get("/my-attendance", requireAuth, getMyAttendance);
router.get("/myattendance", requireAuth, getMyAttendance);

export default router;
