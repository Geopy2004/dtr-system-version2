import { supabase } from "./supabase";

// Auth API
export const authAPI = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
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

// Profile API
export const profileAPI = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    if (error) throw error;
    return data;
  },

  async createUser(email, password, profileData) {
    void email;
    void password;
    void profileData;
    throw new Error("User creation must be handled by a trusted backend.");
  },

  async deleteUser(userId) {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) throw error;
  },
};

// Attendance API
const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("User not authenticated");

  return user;
};

const getLocalDateString = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split("T")[0];
};

const getAttendanceStatus = (timeIn) => {
  const date = new Date(timeIn);
  const lateMinutes = (date.getHours() - 8) * 60 + date.getMinutes();

  if (lateMinutes > 0) {
    return { status: "late", late_minutes: lateMinutes };
  }

  return { status: "present", late_minutes: 0 };
};

const getAttendanceStats = (records) => ({
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
  total_hours: records
    .reduce((sum, record) => sum + (Number(record.hours_worked) || 0), 0)
    .toFixed(2),
});

const getMissingSchemaColumn = (error) => {
  if (error?.code !== "PGRST204") return null;

  const match = error.message?.match(/'([^']+)' column/);
  return match?.[1] || null;
};

const runWithSchemaFallback = async (createQuery, payload) => {
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
};

const calculateHoursWorked = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end.getTime() - start.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;

  return Number((diffMs / 1000 / 60 / 60).toFixed(2));
};

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

  return calculateHoursWorked(record.time_in, endTime);
};

export const attendanceAPI = {
  async morningIn(location = "", notes = "") {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const today = getLocalDateString(now);

    const { data: existing, error: existingError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) throw new Error("Already timed in today.");

    const { status, late_minutes } = getAttendanceStatus(now);

    return runWithSchemaFallback(
      (payload) =>
        supabase
          .from("attendance")
          .insert([payload])
          .select()
          .single(),
      {
        user_id: user.id,
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
  },

  async timeIn(location = "", notes = "") {
    return attendanceAPI.morningIn(location, notes);
  },

  async lunchOut() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.lunch_time_out) throw new Error("Already timed out for lunch.");

    return runWithSchemaFallback(
      (payload) =>
        supabase
          .from("attendance")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      {
        lunch_time_out: now.toISOString(),
      }
    );
  },

  async lunchIn() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (!existing.lunch_time_out) throw new Error("Record lunch out first.");
    if (existing.lunch_time_in) throw new Error("Already timed in after lunch.");

    return runWithSchemaFallback(
      (payload) =>
        supabase
          .from("attendance")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single(),
      {
        lunch_time_in: now.toISOString(),
      }
    );
  },

  async timeOut() {
    const user = await getAuthenticatedUser();
    const now = new Date();
    const today = getLocalDateString(now);

    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.time_out) throw new Error("Already timed out today.");
    if (existing.lunch_time_out && !existing.lunch_time_in) {
      throw new Error("Record lunch in first.");
    }

    const hoursWorked = calculateSplitHours(existing, now);

    return runWithSchemaFallback(
      (payload) =>
        supabase
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
  },

  async afternoonOut() {
    return attendanceAPI.timeOut();
  },

  async getTodayRecord() {
    const user = await getAuthenticatedUser();
    const today = getLocalDateString();

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getRecords(startDate, endDate) {
    const user = await getAuthenticatedUser();

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllRecords(startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, email, department)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getMyAttendance(params = {}) {
    const { startDate, endDate, limit } = params;
    const user = await getAuthenticatedUser();

    let query = supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id);

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    query = query
      .order("date", { ascending: false })
      .order("time_in", { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    const records = data || [];

    return {
      attendance: records,
      stats: getAttendanceStats(records),
    };
  },
};
