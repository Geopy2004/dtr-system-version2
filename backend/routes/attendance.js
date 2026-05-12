import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const TIME_ZONE = process.env.ATTENDANCE_TIME_ZONE || "Asia/Singapore";
const LATE_CUTOFF_HOUR = Number(process.env.ATTENDANCE_LATE_HOUR || 8);
const LATE_CUTOFF_MINUTE = Number(process.env.ATTENDANCE_LATE_MINUTE || 0);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase backend environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getRequestSupabase(req) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return supabase;
  }

  const token = req.headers.authorization?.replace("Bearer ", "");

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
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

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.replace("Bearer ", "");
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
    const { location = "", notes = "" } = req.body || {};
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
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

async function timeOut(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = getAttendanceDate(now);

    const { data: existing, error: fetchError } = await req.supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      return res
        .status(400)
        .json({ message: "No time in record found for today" });
    }

    if (existing.time_out) {
      return res.status(400).json({ message: "Already timed out today" });
    }

    const hoursWorked = calculateHoursWorked(existing.time_in, now);

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
        hours_worked: hoursWorked,
      }
    );

    return res.json({ message: "Time out recorded", attendance: data });
  } catch (err) {
    console.error("Time out error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

async function getMyAttendance(req, res) {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);

    let query = req.supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      query = query.limit(parsedLimit);
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
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

router.post("/timein", requireAuth, timeIn);
router.post("/time-in", requireAuth, timeIn);
router.post("/timeout", requireAuth, timeOut);
router.post("/time-out", requireAuth, timeOut);
router.get("/my-attendance", requireAuth, getMyAttendance);
router.get("/myattendance", requireAuth, getMyAttendance);

export default router;
