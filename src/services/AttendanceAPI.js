import { supabase } from "./supabase";
import { assertIsoDate, assertUuid, normalizeLimit } from "../utils/security";

// ─────────────────────────────────────────────
// ATTENDANCE API
// ─────────────────────────────────────────────

export const attendanceAPI = {
  // TIME IN
  async timeIn(userId) {
    const safeUserId = assertUuid(userId, "user ID");
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Check existing record
    const { data: existing, error: existingError } =
      await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", safeUserId)
        .eq("date", today)
        .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      throw new Error("Already timed in today.");
    }

    // Determine status
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    let status = "present";
    let late_minutes = 0;

    // Example: late after 8:00 AM
    if (currentHour >= 8 && currentMinute > 0) {
      status = "late";

      late_minutes =
        (currentHour - 8) * 60 + currentMinute;
    }

    const { data, error } = await supabase
      .from("attendance")
      .insert([
        {
          user_id: safeUserId,
          date: today,
          time_in: now.toISOString(),
          status,
          late_minutes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // TIME OUT
  async timeOut(userId) {
    const safeUserId = assertUuid(userId, "user ID");
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const {
      data: existing,
      error: fetchError,
    } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", safeUserId)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      throw new Error(
        "No time-in record found for today."
      );
    }

    if (existing.time_out) {
      throw new Error("Already timed out today.");
    }

    const timeIn = new Date(existing.time_in);

    const hoursWorked = (
      (now - timeIn) /
      1000 /
      60 /
      60
    ).toFixed(2);

    const { data, error } = await supabase
      .from("attendance")
      .update({
        time_out: now.toISOString(),
        hours_worked: hoursWorked,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // TODAY RECORD
  async getTodayRecord(userId) {
    const safeUserId = assertUuid(userId, "user ID");
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", safeUserId)
      .eq("date", today)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  // USER RECORDS
  async getRecords(
    userId,
    startDate,
    endDate
  ) {
    const safeUserId = assertUuid(userId, "user ID");
    const safeStartDate = assertIsoDate(startDate, "start date");
    const safeEndDate = assertIsoDate(endDate, "end date");
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", safeUserId)
      .gte("date", safeStartDate)
      .lte("date", safeEndDate)
      .order("date", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // DASHBOARD API
  async getMyAttendance({
    startDate,
    endDate,
    limit,
  } = {}) {
    // Get logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User not authenticated");
    }

    let query = supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", {
        ascending: false,
      });

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lte("date", endDate);
    }

    if (limit) {
      query = query.limit(normalizeLimit(limit, 100, 250));
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total_days: data?.length || 0,

      present:
        data?.filter(
          (r) => r.status === "present"
        ).length || 0,

      late:
        data?.filter((r) => r.status === "late")
          .length || 0,

      total_late_minutes:
        data?.reduce(
          (sum, r) =>
            sum + (r.late_minutes || 0),
          0
        ) || 0,
    };

    return {
      attendance: data || [],
      stats,
    };
  },

  // ADMIN: ALL RECORDS
  async getAllRecords(startDate, endDate) {
    const safeStartDate = assertIsoDate(startDate, "start date");
    const safeEndDate = assertIsoDate(endDate, "end date");
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        *,
        profiles (
          full_name,
          email,
          department
        )
      `
      )
      .gte("date", safeStartDate)
      .lte("date", safeEndDate)
      .order("date", { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // ADMIN: USER RECORDS
  async getUserRecords(
    userId,
    startDate,
    endDate
  ) {
    const safeUserId = assertUuid(userId, "user ID");
    const safeStartDate = assertIsoDate(startDate, "start date");
    const safeEndDate = assertIsoDate(endDate, "end date");
    const { data, error } = await supabase
      .from("attendance")
      .select(
        `
        *,
        profiles (
          full_name,
          email,
          department
        )
      `
      )
      .eq("user_id", safeUserId)
      .gte("date", safeStartDate)
      .lte("date", safeEndDate)
      .order("date", { ascending: false });

    if (error) throw error;

    return data || [];
  },
};

// ─────────────────────────────────────────────
// ADMIN API
// ─────────────────────────────────────────────

export const adminAPI = {
  async getDashboardStats() {
    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      });

    // Active users
    const { count: activeUsers } =
      await supabase
        .from("profiles")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("is_active", true);

    // Today's attendance
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const { data: attendanceData, error } =
      await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);

    if (error) throw error;

    const present =
      attendanceData?.filter(
        (a) => a.status === "present"
      ).length || 0;

    const late =
      attendanceData?.filter(
        (a) => a.status === "late"
      ).length || 0;

    const half_day =
      attendanceData?.filter(
        (a) => a.status === "half_day"
      ).length || 0;

    return {
      total_users: totalUsers || 0,

      active_users: activeUsers || 0,

      today_attendance: {
        total_checked_in:
          attendanceData?.length || 0,

        present,
        late,
        half_day,
      },

      today_logged_in: activeUsers || 0,
    };
  },

  async getAllAttendance({
    limit = 10,
  } = {}) {
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
      .order("date", {
        ascending: false,
      })
      .limit(normalizeLimit(limit, 10, 250));

    if (error) throw error;

    return {
      attendance: data || [],
    };
  },
};
