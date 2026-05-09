import { supabase } from "./supabase";

// 🔥 FIXED: backend port (NOT 5173)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// ======================
// GET SUPABASE TOKEN
// ======================
const getToken = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    return null;
  }

  return data?.session?.access_token || null;
};

// ======================
// BASE REQUEST
// ======================
const apiRequest = async (endpoint, options = {}) => {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    console.log("API ERROR:", data);
    throw new Error(data?.message || "Request failed");
  }

  return data;
};

// ======================
// ATTENDANCE API
// ======================
export const attendanceAPI = {
  timeIn: (location = "", notes = "") =>
    apiRequest("/attendance/timein", {
      method: "POST",
      body: JSON.stringify({ location, notes }),
    }),

  timeOut: () =>
    apiRequest("/attendance/timeout", {
      method: "POST",
    }),

  getMyAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/attendance/my-attendance?${query}`);
  },
};

// ======================
// ADMIN API (COMPLETE)
// ======================
export const adminAPI = {
  getAllUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/users?${query}`);
  },

  updateUser: (id, data) =>
    apiRequest(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteUser: (id) =>
    apiRequest(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  getAllAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/attendance?${query}`);
  },

  getDashboardStats: () =>
    apiRequest("/admin/dashboard-stats"),

  getUserLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/logs?${query}`);
  },
};