import { supabase } from "./supabase";

export const ATTENDANCE_TABLE =
  import.meta.env.VITE_ATTENDANCE_TABLE || "attendance";

const getLocalDateString = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split("T")[0];
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
  const next = value ?? "";
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

const getAttendanceStatus = (timeIn, graceMinutes = 15) => {
  const date = new Date(timeIn);
  const shiftStart = new Date(date);
  shiftStart.setHours(8, graceMinutes, 0, 0);
  const lateMinutes = Math.max(
    0,
    Math.round((date.getTime() - shiftStart.getTime()) / 60000)
  );

  if (lateMinutes > 0) {
    return { status: "late", late_minutes: lateMinutes };
  }

  return { status: "present", late_minutes: 0 };
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
      email,
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName,
          department,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          department,
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
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
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
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Employee";

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
          email: user.email,
          full_name: fullName,
          department: user.user_metadata?.department || "Unassigned",
          role,
          is_active: true,
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTable(error, "profiles")) {
          return {
            id: user.id,
            email: user.email,
            full_name: fullName,
            department: user.user_metadata?.department || "Unassigned",
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
          email: user.email,
          full_name: fullName,
          department: user.user_metadata?.department || "Unassigned",
          role,
          is_active: true,
        };
      }
      throw error;
    }
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
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
    const user = await getAuthenticatedUser();
    const ownerId = userId || user.id;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
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

export const attendanceAPI = {
  async morningIn(location = "", notes = "", coordinates = {}) {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const today = getLocalDateString(now);

    const { data: existing, error: existingError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) throw new Error("Already timed in today.");

    const { status, late_minutes } = getAttendanceStatus(now);
    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase.from(ATTENDANCE_TABLE).insert(payload).select("*").single(),
      {
        user_id: user.id,
        date: today,
        time_in: now.toISOString(),
        morning_time_in: now.toISOString(),
        location,
        latitude: coordinates.latitude ?? null,
        longitude: coordinates.longitude ?? null,
        notes,
        status,
        late_minutes,
        overtime_minutes: 0,
        undertime_minutes: 0,
        hours_worked: 0,
        source: "web",
      }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "time_in",
      eventTime: now.toISOString(),
      metadata: { location },
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
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.lunch_time_out) throw new Error("Lunch out is already recorded.");

    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase
          .from(ATTENDANCE_TABLE)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single(),
      { lunch_time_out: now.toISOString() }
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
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (!existing.lunch_time_out) throw new Error("Record break out first.");
    if (existing.lunch_time_in) throw new Error("Break in is already recorded.");

    const attendance = await runWithSchemaFallback(
      (payload) =>
        supabase
          .from(ATTENDANCE_TABLE)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single(),
      { lunch_time_in: now.toISOString() }
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
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.time_out || existing.afternoon_time_out) {
      throw new Error("Already timed out today.");
    }
    if (existing.lunch_time_out && !existing.lunch_time_in) {
      throw new Error("Record break in first.");
    }

    const hoursWorked = calculateSplitHours(existing, now);
    const expectedHours = 8;
    const overtimeMinutes = Math.max(0, Math.round((hoursWorked - expectedHours) * 60));
    const undertimeMinutes = Math.max(0, Math.round((expectedHours - hoursWorked) * 60));
    const nextStatus =
      existing.status === "late"
        ? "late"
        : hoursWorked >= expectedHours
          ? "present"
          : "undertime";

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
        hours_worked: hoursWorked,
        overtime_minutes: overtimeMinutes,
        undertime_minutes: undertimeMinutes,
        status: nextStatus,
      }
    );

    await addAttendanceLog({
      attendanceId: attendance.id,
      eventType: "time_out",
      eventTime: now.toISOString(),
      metadata: { hours_worked: hoursWorked },
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

    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
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
        startDate,
        endDate
      )
    );
  },

  async getAllRecords(startDate, endDate) {
    let query = supabase
      .from(ATTENDANCE_TABLE)
      .select("*, profiles(full_name, email, department, department_id, position)")
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

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
        startDate,
        endDate
      )
    );
  },

  async getMyAttendance(params = {}) {
    const { startDate, endDate, limit } = params;
    const user = await getAuthenticatedUser();

    let query = supabase
      .from(ATTENDANCE_TABLE)
      .select("*")
      .eq("user_id", user.id);

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    query = query
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (limit) query = query.limit(limit);

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

      if (limit) legacyQuery = legacyQuery.limit(limit);

      const { data: legacyData, error: legacyError } = await legacyQuery;
      if (legacyError) throw legacyError;

      records = sortAttendanceRecords(
        filterAttendanceByDateRange(
          (legacyData || []).map(normalizeAttendanceRecord),
          startDate,
          endDate
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
    const query = payload.id
      ? supabase.from("departments").update(payload).eq("id", payload.id)
      : supabase.from("departments").insert(payload);
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
    const query = payload.id
      ? supabase.from("shifts").update(payload).eq("id", payload.id)
      : supabase.from("shifts").insert(payload);
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
    const query = payload.id
      ? supabase.from("schedules").update(payload).eq("id", payload.id)
      : supabase.from("schedules").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },
};

export const leaveAPI = {
  async uploadDocument(file) {
    const user = await getAuthenticatedUser();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
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
    const data = await runWithSchemaFallback(
      (request) =>
        supabase
          .from("leave_requests")
          .insert(request)
          .select("*")
          .single(),
      {
        user_id: user.id,
        leave_type: payload.leave_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: Number(payload.total_days) || 1,
        reason: payload.reason,
        document_url: documentUrl,
        status: "pending",
      }
    );

    await addActivityLog({
      action: "leave.submit",
      description: `Submitted ${payload.leave_type} leave request`,
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
      .select("*, profiles(full_name, email, department)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async reviewLeave(id, status, review_notes = "") {
    const user = await getAuthenticatedUser();
    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        review_notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const logAPI = {
  async getMyLogs(limit = 100) {
    const user = await getAuthenticatedUser();
    const [activityResult, attendanceResult] = await Promise.all([
      supabase
        .from("activity_logs")
        .select("*")
        .or(`actor_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("attendance_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("event_time", { ascending: false })
        .limit(limit),
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
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*, actor:profiles!activity_logs_actor_id_fkey(full_name, email)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },
};

export const notificationAPI = {
  async getMyNotifications() {
    const user = await getAuthenticatedUser();
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
    const { data, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const adminAPI = {
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
    const { data, error } = await supabase.functions.invoke("invite-employee", {
      body: payload,
    });
    if (error) throw error;
    return data;
  },

  async updateUser(userId, updates) {
    return profileAPI.updateProfile(userId, updates);
  },

  async archiveUser(userId, isActive) {
    return profileAPI.updateProfile(userId, { is_active: isActive });
  },

  async sendPasswordReset(email) {
    return authAPI.resetPassword(email);
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
    const query = payload.id
      ? supabase.from("holidays").update(payload).eq("id", payload.id)
      : supabase.from("holidays").insert(payload);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },
};

export const realtimeAPI = {
  subscribeToAttendance(callback, filter) {
    let config = { event: "*", schema: "public", table: ATTENDANCE_TABLE };
    if (filter) config = { ...config, filter };

    const channel = supabase
      .channel(`attendance:${filter || "all"}`)
      .on("postgres_changes", config, callback)
      .subscribe();

    return () => supabase.removeChannel(channel);
  },

  subscribeToTable(table, callback, filter) {
    let config = { event: "*", schema: "public", table };
    if (filter) config = { ...config, filter };

    const channel = supabase
      .channel(`${table}:${filter || "all"}`)
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
