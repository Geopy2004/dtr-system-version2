import { supabase } from "./supabase";

export const AttendanceAPI = {
  // Time in
  async timeIn(userId) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check if already timed in today
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (existing) {
      throw new Error("Already timed in today.");
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert([{ user_id: userId, date: today, time_in: now.toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Time out
  async timeOut(userId) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.time_out) throw new Error("Already timed out today.");

    const timeIn = new Date(existing.time_in);
    const hoursWorked = (now - timeIn) / 1000 / 60 / 60;

    const { data, error } = await supabase
      .from("attendance")
      .update({ time_out: now.toISOString(), hours_worked: hoursWorked.toFixed(2) })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get today's record
  async getTodayRecord(userId) {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Get records by date range
  async getRecords(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Admin: get all records
  async getAllRecords(startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, email, department)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },

  // Admin: get all records for a specific user
  async getUserRecords(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, email, department)")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  },
};
// Admin API
export const adminAPI = {
  async getDashboardStats() {
    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Active users
    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Today's attendance
    const today = new Date().toISOString().split("T")[0];

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", today);

    const present =
      attendanceData?.filter((a) => a.status === "present").length || 0;

    const late =
      attendanceData?.filter((a) => a.status === "late").length || 0;

    const half_day =
      attendanceData?.filter((a) => a.status === "half_day").length || 0;

    return {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,

      today_attendance: {
        total_checked_in: attendanceData?.length || 0,
        present,
        late,
        half_day,
      },

      today_logged_in: activeUsers || 0,
    };
  },

  async getAllAttendance({ limit = 10 } = {}) {
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        *,
        profiles (
          full_name,
          department
        )
      `
      )
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      attendance: data || [],
    };
  },
};