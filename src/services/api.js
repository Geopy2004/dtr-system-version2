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
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;

    const { data, error } = await supabase
      .from("profiles")
      .insert([{ id: authData.user.id, email, ...profileData }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteUser(userId) {
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) throw error;
  },
};

// Attendance API
export const attendanceAPI = {
  async timeIn(userId) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (existing) throw new Error("Already timed in today.");

    const { data, error } = await supabase
      .from("attendance")
      .insert([{ user_id: userId, date: today, time_in: now.toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async timeOut(userId) {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error("No time-in record found for today.");
    if (existing.time_out) throw new Error("Already timed out today.");

    const timeIn = new Date(existing.time_in);
    const hoursWorked = ((now - timeIn) / 1000 / 60 / 60).toFixed(2);

    const { data, error } = await supabase
      .from("attendance")
      .update({ time_out: now.toISOString(), hours_worked: hoursWorked })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTodayRecord(userId) {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getRecords(userId, startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllRecords(startDate, endDate) {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, profiles(full_name, email, department)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};