import { supabase } from "./supabase";
import {
  assertAllowedFile,
  assertEnum,
  assertIsoDate,
  assertOptionalIsoDate,
  assertTime,
  assertUuid,
  isSafeDbIdentifier,
  isUuid,
  normalizeLimit,
  normalizeNonNegativeInt,
  normalizePositiveNumber,
  sanitizeCsvValue,
  sanitizeEmail,
  sanitizeFilename,
  sanitizeText,
} from "../utils/security";

export const ATTENDANCE_TABLE =
  isSafeDbIdentifier(import.meta.env.VITE_ATTENDANCE_TABLE)
    ? import.meta.env.VITE_ATTENDANCE_TABLE
    : "attendance";

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_LEAVE_DOCUMENT_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const USER_ROLES = ["admin", "employee"];
const LEAVE_TYPES = ["Vacation", "Sick", "Emergency", "Personal", "Bereavement"];
const LEAVE_REVIEW_STATUSES = ["approved", "rejected", "cancelled"];
const HOLIDAY_TYPES = ["Regular", "Special", "Company"];

const getLocalDateString = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split("T")[0];
};

const DEFAULT_SHIFT = {
  name: "Default",
  start_time: "08:00",
  end_time: "17:00",
  break_minutes: 60,
  grace_period_minutes: 15,
  expected_hours: 8,
};

const OPEN_SHIFT_LOOKBACK_DAYS = 2;
const EARLY_SHIFT_WINDOW_HOURS = 4;

const getMinutesFromTime = (value, fallback = 0) => {
  if (typeof value !== "string") return fallback;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  return hours * 60 + minutes;
};

const dateFromLocalParts = (dateString, minutesFromMidnight) => {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  date.setMinutes(minutesFromMidnight);
  return date;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

const normalizeShift = (shift = {}) => ({
  ...DEFAULT_SHIFT,
  ...Object.fromEntries(
    Object.entries(shift || {}).filter(([, value]) => value !== null && value !== undefined)
  ),
});

const buildShiftWindow = (attendanceDate, shiftInput) => {
  const shift = normalizeShift(shiftInput);
  const startMinutes = getMinutesFromTime(shift.start_time, 8 * 60);
  const endMinutes = getMinutesFromTime(shift.end_time, 17 * 60);
  const breakMinutes = Math.max(0, Number(shift.break_minutes) || 0);
  const start = dateFromLocalParts(attendanceDate, startMinutes);
  let end = dateFromLocalParts(attendanceDate, endMinutes);

  if (end <= start) end = addMinutes(end, 24 * 60);

  const shiftMinutes = Math.max(0, Math.round((end - start) / 60000));
  const workBeforeBreak = Math.max(0, Math.round((shiftMinutes - breakMinutes) / 2));
  const breakOut = addMinutes(start, workBeforeBreak);
  const breakIn = addMinutes(breakOut, breakMinutes);

  return {
    shift,
    start,
    breakOut,
    breakIn,
    end,
    graceMinutes: Math.max(0, Number(shift.grace_period_minutes) || 0),
    expectedHours: Number(shift.expected_hours) || Math.max(0, (shiftMinutes - breakMinutes) / 60),
  };
};

const getCheckpointDelta = (actualValue, target, graceMinutes = 0) => {
  if (!actualValue || !target) return { early: 0, late: 0 };
  const actual = new Date(actualValue);
  if (Number.isNaN(actual.getTime())) return { early: 0, late: 0 };

  const diffMinutes = Math.round((actual.getTime() - target.getTime()) / 60000);
  return {
    early: Math.max(0, -diffMinutes),
    late: Math.max(0, diffMinutes - graceMinutes),
  };
};

const getBrowserDevice = () => {
  if (typeof navigator === "undefined") return "Unknown device";

  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac/i.test(ua)) return "macOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Web browser";
};

const toCsvValue = (value) => {
  const next = sanitizeCsvValue(value);
  return `"${String(next).replaceAll('"', '""')}"`;
};

export const exportRowsToCsv = (filename, rows, columns) => {
  const header = columns.map((column) => toCsvValue(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => {
          const value =
            typeof column.value === "function"
              ? column.value(row)
              : row[column.value];
          return toCsvValue(value);
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const adminEmails = new Set(["admin@gmail.com", "admin@company.com"]);

export const isAdminEmail = (email) =>
  typeof email === "string" && adminEmails.has(email.toLowerCase());

const isMissingTable = (error, tableName) => {
  if (!error?.message) return false;
  return (
    error.message.includes(`Could not find the table 'public.${tableName}'`) ||
    error.message.includes(`relation "${tableName}" does not exist`) ||
    error.code === "PGRST102"
  );
};

const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("User not authenticated");

  return user;
};

const getMissingSchemaColumn = (error) => {
  if (!["PGRST204", "42703"].includes(error?.code)) return null;

  const schemaCacheMatch = error.message?.match(/'([^']+)' column/);
  if (schemaCacheMatch?.[1]) return schemaCacheMatch[1];

  const postgresMatch = error.message?.match(/column\s+\S+\.([^\s]+)\s+does not exist/i);
  return postgresMatch?.[1] || null;
};

const isMissingReadColumn = (error) =>
  ["date", "time_in"].includes(getMissingSchemaColumn(error));

const runWithSchemaFallback = async (createQuery, payload) => {
  let nextPayload = { ...payload };
  const maxAttempts = Object.keys(payload).length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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

  throw new Error("Database schema does not match the requested payload.");
};

const pickDefined = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const sanitizeProfileUpdates = (updates = {}) =>
  pickDefined({
    full_name:
      "full_name" in updates
        ? sanitizeText(updates.full_name, { maxLength: 120, allowNewlines: false })
        : undefined,
    department:
      "department" in updates
        ? sanitizeText(updates.department, { maxLength: 80, allowNewlines: false })
        : undefined,
    position:
      "position" in updates
        ? sanitizeText(updates.position, { maxLength: 80, allowNewlines: false })
        : undefined,
    phone:
      "phone" in updates
        ? sanitizeText(updates.phone, { maxLength: 40, allowNewlines: false })
        : undefined,
    avatar_url:
      "avatar_url" in updates
        ? sanitizeText(updates.avatar_url, { maxLength: 500, allowNewlines: false })
        : undefined,
    role:
      "role" in updates ? assertEnum(updates.role, USER_ROLES, "role") : undefined,
    is_active:
      "is_active" in updates ? Boolean(updates.is_active) : undefined,
  });

const sanitizeDepartmentPayload = (payload = {}) =>
  pickDefined({
    id: payload.id ? assertUuid(payload.id, "department ID") : undefined,
    name: sanitizeText(payload.name, { maxLength: 100, allowNewlines: false }),
    code: sanitizeText(payload.code, { maxLength: 20, allowNewlines: false }).toUpperCase(),
    manager_id: payload.manager_id ? assertUuid(payload.manager_id, "manager ID") : null,
    is_active: "is_active" in payload ? Boolean(payload.is_active) : true,
  });

const sanitizeShiftPayload = (payload = {}) =>
  pickDefined({
    id: payload.id ? assertUuid(payload.id, "shift ID") : undefined,
    name: sanitizeText(payload.name, { maxLength: 80, allowNewlines: false }),
    start_time: assertTime(payload.start_time || DEFAULT_SHIFT.start_time, "start time"),
    end_time: assertTime(payload.end_time || DEFAULT_SHIFT.end_time, "end time"),
    break_minutes: normalizeNonNegativeInt(payload.break_minutes, 60, 720),
    grace_period_minutes: normalizeNonNegativeInt(payload.grace_period_minutes, 15, 240),
    expected_hours: normalizePositiveNumber(payload.expected_hours, 8, 24),
  });

const sanitizeSchedulePayload = (payload = {}) => {
  const days = Array.isArray(payload.days_of_week)
    ? payload.days_of_week
        .map((day) => Number.parseInt(day, 10))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];

  return pickDefined({
    id: payload.id ? assertUuid(payload.id, "schedule ID") : undefined,
    user_id: payload.user_id ? assertUuid(payload.user_id, "user ID") : null,
    department_id: payload.department_id
      ? assertUuid(payload.department_id, "department ID")
      : null,
    shift_id: assertUuid(payload.shift_id, "shift ID"),
    valid_from: assertIsoDate(payload.valid_from, "valid from date"),
    valid_to: assertOptionalIsoDate(payload.valid_to, "valid to date"),
    days_of_week: [...new Set(days)],
    is_active: "is_active" in payload ? Boolean(payload.is_active) : true,
  });
};

const sanitizeRealtimeFilter = (filter) => {
  if (!filter) return null;
  const match = String(filter).match(/^([a-z_][a-z0-9_]*)=eq\.([0-9a-f-]{36})$/i);
  if (!match || !isUuid(match[2])) {
    throw new Error("Invalid realtime filter.");
  }

  return `${match[1]}=eq.${match[2]}`;
};

const calculateHoursWorked = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Number((diffMs / 1000 / 60 / 60).toFixed(2));
};

const getAttendanceDateFromRecord = (record) => {
  if (record.date) return record.date;

  const timestamp =
    record.morning_time_in ||
    record.time_in ||
    record.created_at ||
    record.updated_at;
  if (!timestamp) return null;

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : getLocalDateString(date);
};

const normalizeAttendanceRecord = (record) => {
  const fallbackStart =
    record.morning_time_in || record.time_in || record.created_at || null;
  const fallbackEnd = record.afternoon_time_out || record.time_out || null;

  return {
    ...record,
    date: getAttendanceDateFromRecord(record),
    time_in: record.time_in || fallbackStart,
    morning_time_in: record.morning_time_in || record.time_in || fallbackStart,
    time_out: record.time_out || fallbackEnd,
    afternoon_time_out: record.afternoon_time_out || record.time_out || fallbackEnd,
    status: record.status || "present",
  };
};

const filterAttendanceByDateRange = (records, startDate, endDate) =>
  records.filter((record) => {
    if (!record.date) return false;
    return (!startDate || record.date >= startDate) && (!endDate || record.date <= endDate);
  });

const sortAttendanceRecords = (records) =>
  [...records].sort((a, b) => {
    const left = new Date(a.time_in || a.created_at || a.date || 0).getTime();
    const right = new Date(b.time_in || b.created_at || b.date || 0).getTime();
    return right - left;
  });

const calculateSplitHours = (record, endTime) => {
  const morningHours =
    record.morning_time_in && record.lunch_time_out
      ? calculateHoursWorked(record.morning_time_in, record.lunch_time_out)
      : 0;
  const afternoonHours =
    record.lunch_time_in && endTime
      ? calculateHoursWorked(record.lunch_time_in, endTime)
      : 0;

  if (morningHours || afternoonHours) {
    return Number((morningHours + afternoonHours).toFixed(2));
  }

  return calculateHoursWorked(record.time_in || record.morning_time_in, endTime);
};

const getTimingBreakdown = (record, shiftInput) => {
  const attendanceDate =
    record.date || getAttendanceDateFromRecord(record) || getLocalDateString();
  const window = buildShiftWindow(attendanceDate, shiftInput);
  const checkpoints = {
    morning_time_in: getCheckpointDelta(
      record.morning_time_in || record.time_in,
      window.start,
      window.graceMinutes
    ),
    lunch_time_out: getCheckpointDelta(
      record.lunch_time_out,
      window.breakOut,
      window.graceMinutes
    ),
    lunch_time_in: getCheckpointDelta(
      record.lunch_time_in,
      window.breakIn,
      window.graceMinutes
    ),
    afternoon_time_out: getCheckpointDelta(
      record.afternoon_time_out || record.time_out,
      window.end,
      window.graceMinutes
    ),
  };
  const earlyMinutes = Object.values(checkpoints).reduce((sum, item) => sum + item.early, 0);
  const lateMinutes = Object.values(checkpoints).reduce((sum, item) => sum + item.late, 0);

  return {
    attendanceDate,
    earlyMinutes,
    lateMinutes,
    expectedHours: window.expectedHours,
    checkpoints,
    targets: {
      morning_time_in: window.start.toISOString(),
      lunch_time_out: window.breakOut.toISOString(),
      lunch_time_in: window.breakIn.toISOString(),
      afternoon_time_out: window.end.toISOString(),
    },
    shift: {
      name: window.shift.name,
      start_time: window.shift.start_time,
      end_time: window.shift.end_time,
      break_minutes: Number(window.shift.break_minutes) || 0,
      grace_period_minutes: window.graceMinutes,
      expected_hours: window.expectedHours,
    },
  };
};

const getAttendanceStatus = ({
  lateMinutes,
  hoursWorked = 0,
  expectedHours = DEFAULT_SHIFT.expected_hours,
  hasTimeOut = false,
}) => {
  if (lateMinutes > 0) return "late";
  if (!hasTimeOut) return "present";
  if (hoursWorked > expectedHours) return "overtime";
  if (hoursWorked < expectedHours) return "undertime";
  return "present";
};

const getAttendanceStats = (records) => {
  const present = records.filter((record) =>
    ["present", "late", "overtime", "half-day", "halfday"].includes(
      record.status
    )
  ).length;
  const late = records.filter((record) => record.status === "late").length;
  const absent = records.filter((record) => record.status === "absent").length;
  const totalLateMinutes = records.reduce(
    (sum, record) => sum + (Number(record.late_minutes) || 0),
    0
  );
  const totalEarlyMinutes = records.reduce(
    (sum, record) => sum + (Number(record.early_minutes) || 0),
    0
  );
  const totalHours = records.reduce(
    (sum, record) => sum + (Number(record.hours_worked) || 0),
    0
  );

  return {
    total_days: records.length,
    present,
    late,
    absent,
    half_day: records.filter((record) =>
      ["half-day", "halfday"].includes(record.status)
    ).length,
    total_late_minutes: totalLateMinutes,
    total_early_minutes: totalEarlyMinutes,
    total_hours: Number(totalHours.toFixed(2)),
    attendance_percentage: records.length
      ? Math.round((present / records.length) * 100)
      : 0,
  };
};

const addActivityLog = async ({
  action,
  description,
  status = "success",
  targetUserId,
  metadata = {},
}) => {
  try {
    const user = await getAuthenticatedUser();

    await runWithSchemaFallback(
      (payload) =>
        supabase.from("activity_logs").insert(payload).select("id").single(),
      {
        actor_id: user.id,
        target_user_id: targetUserId || user.id,
        action,
        description,
        status,
        device: getBrowserDevice(),
        user_agent:
          typeof navigator === "undefined" ? null : navigator.userAgent,
        metadata,
      }
    );
  } catch {
    // Activity logging should never block the user's primary workflow.
  }
};

const addAttendanceLog = async ({
  attendanceId,
  eventType,
  eventTime,
  metadata = {},
}) => {
  try {
    const user = await getAuthenticatedUser();

    await runWithSchemaFallback(
      (payload) =>
        supabase
          .from("attendance_logs")
          .insert(payload)
          .select("id")
          .single(),
      {
        attendance_id: attendanceId,
        user_id: user.id,
        event_type: eventType,
        event_time: eventTime || new Date().toISOString(),
        device: getBrowserDevice(),
        user_agent:
          typeof navigator === "undefined" ? null : navigator.userAgent,
        metadata,
      }
    );
  } catch {
    // Attendance writes remain the source of truth if log tables are absent.
  }
};

export const authAPI = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizeEmail(email),
      password,
    });
    if (error) throw error;

    await addActivityLog({
      action: "login",
      description: "Signed in to One Punch-In",
      targetUserId: data.user?.id,
    });

    return data;
  },

  async register({ email, password, fullName, department }) {
    const cleanEmail = sanitizeEmail(email);
    const cleanFullName = sanitizeText(fullName, {
      maxLength: 120,
      allowNewlines: false,
    });
    const cleanDepartment = sanitizeText(department, {
      maxLength: 80,
      allowNewlines: false,
    });

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: cleanFullName,
          department: cleanDepartment,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: cleanEmail,
          full_name: cleanFullName,
          department: cleanDepartment,
          role: "employee",
          is_active: true,
        });
      } catch {
        // Hosted projects with email verification may rely on the DB trigger.
      }
    }

    return data;
  },

  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(
      sanitizeEmail(email),
      {
        redirectTo: `${window.location.origin}/update-password`,
      }
    );
    if (error) throw error;
    return data;
  },

  async updatePassword(password) {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  },

  async logout() {
    await addActivityLog({
      action: "logout",
      description: "Signed out of One Punch-In",
    });

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },
};

export const profileAPI = {
  async getProfile(userId) {
    const related = await supabase
      .from("profiles")
      .select("*, departments(name, code), shifts(name, start_time, end_time)")
      .eq("id", userId)
      .maybeSingle();

    if (!related.error) return related.data;
    if (isMissingTable(related.error, "profiles")) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!error) return data;
    if (isMissingTable(error, "profiles")) return null;
    throw error;
  },

  async ensureProfile(user) {
    if (!user) return null;

    const admin =
      user.app_metadata?.role === "admin" || isAdminEmail(user.email);
    const role = admin ? "admin" : "employee";

    const fullName =
      sanitizeText(user.user_metadata?.full_name || user.email?.split("@")[0], {
        maxLength: 120,
        allowNewlines: false,
        fallback: "Employee",
      }) || "Employee";
    const department = sanitizeText(
      user.user_metadata?.department || "Unassigned",
      { maxLength: 80, allowNewlines: false }
    );

    const existing = await profileAPI.getProfile(user.id);
    if (existing) {
      if (admin && existing.role !== "admin") {
        try {
          await profileAPI.updateProfile(user.id, { role: "admin" });
          existing.role = "admin";
        } catch {
          // Ignore profile update failures and return existing profile.
        }
      }
      return existing;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: sanitizeEmail(user.email),
          full_name: fullName,
          department,
          role,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTable(error, "profiles")) {
          return {
            id: user.id,
            email: sanitizeEmail(user.email),
            full_name: fullName,
            department,
            role,
            is_active: true,
          };
        }
        throw error;
      }
      return data;
    } catch (error) {
      if (isMissingTable(error, "profiles")) {
        return {
          id: user.id,
          email: sanitizeEmail(user.email),
          full_name: fullName,
          department,
          role,
          is_active: true,
        };
      }
      throw error;
    }
  },

  async updateProfile(userId, updates) {
    const cleanUserId = assertUuid(userId, "user ID");
    const safeUpdates = sanitizeProfileUpdates(updates);
    if (!Object.keys(safeUpdates).length) throw new Error("No valid profile updates.");

    const { data, error } = await supabase
      .from("profiles")
      .update(safeUpdates)
      .eq("id", cleanUserId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getAllUsers() {
    const related = await supabase
      .from("profiles")
      .select("*, departments(name, code), shifts(name, start_time, end_time)")
      .order("full_name", { ascending: true });

    if (!related.error) return related.data || [];
    if (isMissingTable(related.error, "profiles")) return [];

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (!error) return data || [];
    if (isMissingTable(error, "profiles")) return [];
    throw error;
  },

  async uploadAvatar(file, userId) {
    assertAllowedFile(file, {
      allowedTypes: IMAGE_TYPES,
      maxBytes: MAX_PROFILE_IMAGE_BYTES,
      fieldName: "avatar",
    });
    const user = await getAuthenticatedUser();
    const ownerId = userId ? assertUuid(userId, "user ID") : user.id;
    const safeName = sanitizeFilename(file.name);
    const path = `${ownerId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("profile-images")
      .upload(path, file, { upsert: true });
    if (error) throw error;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(path);

    const avatar_url = data.publicUrl;
    await profileAPI.updateProfile(ownerId, { avatar_url });
    return avatar_url;
  },
};

const getShiftForUser = async (user, referenceDate = new Date()) => {
  const profile = await profileAPI.getProfile(user.id);
  const fallbackShift = normalizeShift(profile?.shifts);
  const referenceDates = [
    getLocalDateString(referenceDate),
    getLocalDateString(addMinutes(referenceDate, -24 * 60)),
  ];

  try {
    let query = supabase
      .from("schedules")
      .select("*, shifts(name, start_time, end_time, break_minutes, grace_period_minutes, expected_hours)")
      .eq("is_active", true)
      .lte("valid_from", referenceDates[0])
      .order("valid_from", { ascending: false });

    if (isUuid(user.id) && isUuid(profile?.department_id)) {
      query = query.or(`user_id.eq.${user.id},department_id.eq.${profile.department_id}`);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const schedule = (data || []).find((item) => {
      if (item.valid_to && item.valid_to < referenceDates[1]) return false;
      return referenceDates.some((dateString) => {
        const date = dateFromLocalParts(dateString, 0);
        return item.days_of_week?.includes?.(date.getDay());
      });
    });

    return normalizeShift(schedule?.shifts || fallbackShift);
  } catch {
    return fallbackShift;
  }
};

const getAttendanceDateForShift = (now, shift) => {
  const today = getLocalDateString(now);
  const candidates = [today, getLocalDateString(addMinutes(now, -24 * 60))];
  const matchedDate = candidates.find((dateString) => {
    const window = buildShiftWindow(dateString, shift);
    return now >= addMinutes(window.start, -EARLY_SHIFT_WINDOW_HOURS * 60) && now <= window.end;
  });

  return matchedDate || today;
};

const getOpenAttendanceRecord = async (userId, now = new Date()) => {
  const earliest = getLocalDateString(addMinutes(now, -OPEN_SHIFT_LOOKBACK_DAYS * 24 * 60));
  const { data, error } = await supabase
    .from(ATTENDANCE_TABLE)
    .select("*")
    .eq("user_id", userId)
    .gte("date", earliest)
    .is("afternoon_time_out", null)
    .order("date", { ascending: false })
    .order("time_in", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
};

const buildTimingPayload = (record, shift, endTime = null) => {
  const timing = getTimingBreakdown(record, shift);
  const hasTimeOut = Boolean(record.afternoon_time_out || record.time_out || endTime);
  const hoursWorked = hasTimeOut
    ? calculateSplitHours(record, record.afternoon_time_out || record.time_out || endTime)
    : Number(record.hours_worked) || 0;
  const status = getAttendanceStatus({
    lateMinutes: timing.lateMinutes,
    hoursWorked,
    expectedHours: timing.expectedHours,
    hasTimeOut,
  });

  return {
    date: timing.attendanceDate,
    status,
    late_minutes: timing.lateMinutes,
    early_minutes: timing.earlyMinutes,
    timing_breakdown: timing,
    hours_worked: Number(hoursWorked.toFixed(2)),
    overtime_minutes: hasTimeOut
      ? Math.max(0, Math.round((hoursWorked - timing.expectedHours) * 60))
      : 0,
    undertime_minutes: hasTimeOut
      ? Math.max(0, Math.round((timing.expectedHours - hoursWorked) * 60))
      : 0,
  };
};

export const attendanceAPI = {
  async morningIn(location = "", notes = "", coordinates = {}) {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const shift = await getShiftForUser(user, now);
    const attendanceDate = getAttendanceDateForShift(now, shift);
    const cleanLocation = sanitizeText(location, {
      maxLength: 160,
      allowNewlines: false,
    });
    const cleanNotes = sanitizeText(notes, { maxLength: 500 });
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);

    const { data: existing, error: existingError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", attendanceDate)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) throw new Error("Already timed in for this shift.");

    const baseRecord = {
      user_id: user.id,
      date: attendanceDate,
      time_in: now.toISOString(),
      morning_time_in: now.toISOString(),
      hours_worked: 0,
    };
    const timingPayload = buildTimingPayload(baseRecord, shift);
    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase.from(ATTENDANCE_TABLE).insert(payload).select("*").single(),
      {
        ...baseRecord,
        location: cleanLocation,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        notes: cleanNotes,
        ...timingPayload,
        source: "web",
      }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "time_in",
      eventTime: now.toISOString(),
      metadata: { location: cleanLocation },
    });
    await addActivityLog({
      action: "attendance.time_in",
      description: "Recorded morning time in",
      metadata: { attendance_id: attendance.id },
    });

    return attendance;
  },

  async timeIn(location = "", notes = "", coordinates = {}) {
    return attendanceAPI.morningIn(location, notes, coordinates);
  },

  async lunchOut() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const shift = await getShiftForUser(user, now);
    const existing = await getOpenAttendanceRecord(user.id, now);

    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.lunch_time_out) throw new Error("Lunch out is already recorded.");

    const nextRecord = { ...existing, lunch_time_out: now.toISOString() };
    const timingPayload = buildTimingPayload(nextRecord, shift);
    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase
          .from(ATTENDANCE_TABLE)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single(),
      { lunch_time_out: now.toISOString(), ...timingPayload }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "break_out",
      eventTime: now.toISOString(),
    });

    return attendance;
  },

  async breakOut() {
    return attendanceAPI.lunchOut();
  },

  async lunchIn() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const shift = await getShiftForUser(user, now);
    const existing = await getOpenAttendanceRecord(user.id, now);

    if (!existing) throw new Error("No time-in record found for today.");
    if (!existing.lunch_time_out) throw new Error("Record break out first.");
    if (existing.lunch_time_in) throw new Error("Break in is already recorded.");

    const nextRecord = { ...existing, lunch_time_in: now.toISOString() };
    const timingPayload = buildTimingPayload(nextRecord, shift);
    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase
          .from(ATTENDANCE_TABLE)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single(),
      { lunch_time_in: now.toISOString(), ...timingPayload }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "break_in",
      eventTime: now.toISOString(),
    });

    return attendance;
  },

  async breakIn() {
    return attendanceAPI.lunchIn();
  },

  async timeOut() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const shift = await getShiftForUser(user, now);
    const existing = await getOpenAttendanceRecord(user.id, now);

    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.time_out || existing.afternoon_time_out) {
      throw new Error("Already timed out today.");
    }
    if (existing.lunch_time_out && !existing.lunch_time_in) {
      throw new Error("Record break in first.");
    }

    const nextRecord = {
      ...existing,
      time_out: now.toISOString(),
      afternoon_time_out: now.toISOString(),
    };
    const timingPayload = buildTimingPayload(nextRecord, shift, now);

    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase
          .from(ATTENDANCE_TABLE)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single(),
      {
        time_out: now.toISOString(),
        afternoon_time_out: now.toISOString(),
        ...timingPayload,
      }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "time_out",
      eventTime: now.toISOString(),
      metadata: { hours_worked: timingPayload.hours_worked },
    });
    await addActivityLog({
      action: "attendance.time_out",
      description: "Recorded afternoon time out",
      metadata: { attendance_id: attendance.id },
    });

    return attendance;
  },

  async afternoonOut() {
    return attendanceAPI.timeOut();
  },

  async getTodayRecord() {
    const user = await getAuthenticatedUser();
    const today = getLocalDateString();

    const openRecord = await getOpenAttendanceRecord(user.id);
    if (openRecord) return normalizeAttendanceRecord(openRecord);

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (!error) return data ? normalizeAttendanceRecord(data) : data;
    if (!isMissingReadColumn(error)) throw error;

    const { data: legacyData, error: legacyError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (legacyError) throw legacyError;

    return (
      sortAttendanceRecords(
        filterAttendanceByDateRange(
          (legacyData || []).map(normalizeAttendanceRecord),
          today,
          today
        )
      )[0] || null
    );
  },

  async getRecords(startDate, endDate) {
    const user = await getAuthenticatedUser();
    const safeStartDate = assertIsoDate(startDate, "start date");
    const safeEndDate = assertIsoDate(endDate, "end date");

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .gte("date", safeStartDate)
      .lte("date", safeEndDate)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (!error) return (data || []).map(normalizeAttendanceRecord);
    if (!isMissingReadColumn(error)) throw error;

    const { data: legacyData, error: legacyError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (legacyError) throw legacyError;
    return sortAttendanceRecords(
      filterAttendanceByDateRange(
        (legacyData || []).map(normalizeAttendanceRecord),
        safeStartDate,
        safeEndDate
      )
    );
  },

  async getAllRecords(startDate, endDate) {
    const safeStartDate = assertOptionalIsoDate(startDate, "start date");
    const safeEndDate = assertOptionalIsoDate(endDate, "end date");
    let query = supabase
      .from(ATTENDANCE_TABLE)
      .select("*, profiles:profiles!attendance_user_id_fkey(full_name, email, department, department_id, position)")
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (safeStartDate) query = query.gte("date", safeStartDate);
    if (safeEndDate) query = query.lte("date", safeEndDate);

    const { data, error } = await query;
    if (!error) return (data || []).map(normalizeAttendanceRecord);
    if (!isMissingReadColumn(error)) throw error;

    let legacyQuery = supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    const { data: legacyData, error: legacyError } = await legacyQuery;
    if (legacyError) throw legacyError;

    return sortAttendanceRecords(
      filterAttendanceByDateRange(
        (legacyData || []).map(normalizeAttendanceRecord),
        safeStartDate,
        safeEndDate
      )
    );
  },

  async getMyAttendance(params = {}) {
    const { startDate, endDate, limit } = params;
    const user = await getAuthenticatedUser();
    const safeStartDate = assertOptionalIsoDate(startDate, "start date");
    const safeEndDate = assertOptionalIsoDate(endDate, "end date");
    const safeLimit = limit ? normalizeLimit(limit, 100, 250) : null;

    let query = supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id);

    if (safeStartDate) query = query.gte("date", safeStartDate);
    if (safeEndDate) query = query.lte("date", safeEndDate);

    query = query
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (safeLimit) query = query.limit(safeLimit);

    const { data, error } = await query;
    let records;

    if (!error) {
      records = (data || []).map(normalizeAttendanceRecord);
    } else {
      if (!isMissingReadColumn(error)) throw error;

      let legacyQuery = supabase
        .from(ATTENDANCE_TABLE)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (safeLimit) legacyQuery = legacyQuery.limit(safeLimit);

      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (legacyError) throw legacyError;

      records = sortAttendanceRecords(
        filterAttendanceByDateRange(
          (legacyData || []).map(normalizeAttendanceRecord),
          safeStartDate,
          safeEndDate
        )
      );
    }

    return {
      attendance: records,
      stats: getAttendanceStats(records),
    };
  },
};

export const departmentAPI = {
  async getDepartments() {
    const { data, error } = await supabase
      .from("departments")
      .select("*, manager:profiles!departments_manager_id_fkey(full_name, email)")
      .order("name", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async saveDepartment(payload) {
    const safePayload = sanitizeDepartmentPayload(payload);
    const query = safePayload.id
      ? supabase.from("departments").update(safePayload).eq("id", safePayload.id)
      : supabase.from("departments").insert(safePayload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },
};

export const shiftAPI = {
  async getShifts() {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("start_time", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async saveShift(payload) {
    const safePayload = sanitizeShiftPayload(payload);
    const query = safePayload.id
      ? supabase.from("shifts").update(safePayload).eq("id", safePayload.id)
      : supabase.from("shifts").insert(safePayload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },

  async getSchedules() {
    const { data, error } = await supabase
      .from("schedules")
      .select("*, profiles(full_name, department), departments(name, code), shifts(name, start_time, end_time)")
      .order("valid_from", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async saveSchedule(payload) {
    const safePayload = sanitizeSchedulePayload(payload);
    const query = safePayload.id
      ? supabase.from("schedules").update(safePayload).eq("id", safePayload.id)
      : supabase.from("schedules").insert(safePayload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },
};

export const leaveAPI = {
  async uploadDocument(file) {
    assertAllowedFile(file, {
      allowedTypes: DOCUMENT_TYPES,
      maxBytes: MAX_LEAVE_DOCUMENT_BYTES,
      fieldName: "leave document",
    });
    const user = await getAuthenticatedUser();
    const safeName = sanitizeFilename(file.name);
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("leave-documents")
      .upload(path, file, { upsert: false });
    if (error) throw error;

    const { data } = await supabase.storage
      .from("leave-documents")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return data?.signedUrl || path;
  },

  async submitRequest(payload, file) {
    const user = await getAuthenticatedUser();
    const documentUrl = file ? await leaveAPI.uploadDocument(file) : null;
    const leaveType = assertEnum(payload.leave_type, LEAVE_TYPES, "leave type");
    const startDate = assertIsoDate(payload.start_date, "start date");
    const endDate = assertIsoDate(payload.end_date, "end date");
    if (startDate > endDate) throw new Error("Start date cannot be after end date.");

    const data = await runWithSchemaFallback(
      (request) =>
        supabase
          .from("leave_requests")
          .insert(request)
          .select("*")
          .single(),
      {
        user_id: user.id,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: normalizePositiveNumber(payload.total_days, 1, 365),
        reason: sanitizeText(payload.reason, { maxLength: 1000 }),
        document_url: documentUrl,
        status: "pending",
      }
    );

    await addActivityLog({
      action: "leave.submit",
      description: `Submitted ${leaveType} leave request`,
      metadata: { leave_request_id: data.id },
    });
    return data;
  },

  async getMyLeaves() {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllLeaves() {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*, profiles:profiles!leave_requests_user_id_fkey(full_name, email, department)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async reviewLeave(id, status, review_notes = "") {
    const user = await getAuthenticatedUser();
    const safeId = assertUuid(id, "leave request ID");
    const safeStatus = assertEnum(status, LEAVE_REVIEW_STATUSES, "leave status");
    const safeReviewNotes = sanitizeText(review_notes, { maxLength: 1000 });
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status: safeStatus,
        review_notes: safeReviewNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", safeId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const logAPI = {
  async getMyLogs(limit = 100) {
    const user = await getAuthenticatedUser();
    if (!isUuid(user.id)) throw new Error("Invalid user ID.");
    const safeLimit = normalizeLimit(limit, 100, 250);
    const [activityResult, attendanceResult] = await Promise.all([
      supabase
        .from("activity_logs")
        .select("*")
        .or(`actor_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(safeLimit),
      supabase
        .from("attendance_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("event_time", { ascending: false })
        .limit(safeLimit),
    ]);

    if (activityResult.error) throw activityResult.error;
    if (attendanceResult.error) throw attendanceResult.error;

    return [
      ...(activityResult.data || []).map((item) => ({
        ...item,
        log_type: "activity",
        timestamp: item.created_at,
      })),
      ...(attendanceResult.data || []).map((item) => ({
        ...item,
        action: item.event_type,
        description: `Attendance event: ${item.event_type}`,
        status: "success",
        log_type: "attendance",
        timestamp: item.event_time,
      })),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  async getAuditTrail(limit = 250) {
    const safeLimit = normalizeLimit(limit, 250, 500);
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*, actor:profiles!activity_logs_actor_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (error) throw error;
    return data || [];
  },
};

export const notificationAPI = {
  async getMyNotifications() {
    const user = await getAuthenticatedUser();
    if (!isUuid(user.id)) throw new Error("Invalid user ID.");
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data || [];
  },

  async markRead(id) {
    const safeId = assertUuid(id, "notification ID");
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", safeId)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const adminAPI = {
  async getAllUsers() {
    return profileAPI.getAllUsers();
  },

  async getDashboardStats(startDate, endDate) {
    const [users, attendance, leaves, departments] = await Promise.all([
      profileAPI.getAllUsers(),
      attendanceAPI.getAllRecords(startDate, endDate),
      leaveAPI.getAllLeaves(),
      departmentAPI.getDepartments(),
    ]);

    const today = getLocalDateString();
    const todayRecords = attendance.filter((record) => record.date === today);
    const activeUsers = users.filter((user) => user.is_active !== false);

    return {
      users,
      attendance,
      leaves,
      departments,
      metrics: {
        total_users: users.length,
        active_users: activeUsers.length,
        checked_in_today: todayRecords.length,
        present_today: todayRecords.filter((record) =>
          ["present", "late", "undertime", "overtime"].includes(record.status)
        ).length,
        late_today: todayRecords.filter((record) => record.status === "late")
          .length,
        pending_leaves: leaves.filter((leave) => leave.status === "pending")
          .length,
        departments: departments.length,
      },
    };
  },

  async createEmployee(payload) {
    const safePayload = {
      full_name: sanitizeText(payload.full_name, {
        maxLength: 120,
        allowNewlines: false,
      }),
      email: sanitizeEmail(payload.email),
      department: sanitizeText(payload.department, {
        maxLength: 80,
        allowNewlines: false,
      }),
      role: assertEnum(payload.role || "employee", USER_ROLES, "role"),
      password: String(payload.password || ""),
    };
    const { data, error } = await supabase.functions.invoke("invite-employee", {
      body: safePayload,
    });
    if (error) throw error;
    return data;
  },

  async updateUser(userId, updates) {
    return profileAPI.updateProfile(assertUuid(userId, "user ID"), updates);
  },

  async deleteUser(userId) {
    return profileAPI.updateProfile(assertUuid(userId, "user ID"), { is_active: false });
  },

  async archiveUser(userId, isActive) {
    return profileAPI.updateProfile(assertUuid(userId, "user ID"), {
      is_active: Boolean(isActive),
    });
  },

  async sendPasswordReset(email) {
    return authAPI.resetPassword(sanitizeEmail(email));
  },

  async getHolidays() {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async saveHoliday(payload) {
    const safePayload = pickDefined({
      id: payload.id ? assertUuid(payload.id, "holiday ID") : undefined,
      name: sanitizeText(payload.name, { maxLength: 120, allowNewlines: false }),
      date: assertIsoDate(payload.date, "holiday date"),
      type: assertEnum(payload.type || "Regular", HOLIDAY_TYPES, "holiday type"),
    });
    const query = safePayload.id
      ? supabase.from("holidays").update(safePayload).eq("id", safePayload.id)
      : supabase.from("holidays").insert(safePayload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },
};

export const realtimeAPI = {
  subscribeToAttendance(callback, filter) {
    const safeFilter = sanitizeRealtimeFilter(filter);
    let config = { event: "*", schema: "public", table: ATTENDANCE_TABLE };
    if (safeFilter) config = { ...config, filter: safeFilter };

    const channel = supabase
      .channel(`attendance:${safeFilter || "all"}`)
      .on("postgres_changes", config, callback)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToTable(table, callback, filter) {
    if (!isSafeDbIdentifier(table)) throw new Error("Invalid realtime table.");
    const safeFilter = sanitizeRealtimeFilter(filter);
    let config = { event: "*", schema: "public", table };
    if (safeFilter) config = { ...config, filter: safeFilter };

    const channel = supabase
      .channel(`${table}:${safeFilter || "all"}`)
      .on("postgres_changes", config, callback)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToPresence(user, onSync) {
    const channel = supabase.channel("platform-presence", {
      config: { presence: { key: user?.id || crypto.randomUUID() } },
    });

    channel
      .on("presence", { event: "sync" }, () => onSync(channel.presenceState()))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user?.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => supabase.removeChannel(channel);
  },
};

export { getAttendanceStats, getBrowserDevice, getLocalDateString };
