import { supabase } from './supabase';

// VITE env (with fallback to prevent crash)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost';

// ======================
// Helper: Get Token
// ======================
const getToken = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) return null;

  return data?.session?.access_token || null;
};

// ======================
// API CLIENT
// ======================
const apiClient = async (endpoint, options = {}) => {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw new Error(data?.message || 'API request failed');
  }

  return data;
};

// ======================
// AUTH APIs
// ======================
export const authAPI = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.message || 'Registration failed');
    }

    return response.json();
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) return null;

    return data?.user || null;
  },
};

// ======================
// ATTENDANCE APIs
// ======================
export const attendanceAPI = {
  timeIn: async (location, notes) => {
    return apiClient('/attendance/timein', {
      method: 'POST',
      body: JSON.stringify({ location, notes }),
    });
  },

  timeOut: async () => {
    return apiClient('/attendance/timeout', {
      method: 'POST',
    });
  },

  getMyAttendance: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient(`/attendance/my-attendance?${queryString}`);
  },
};

// ======================
// ADMIN APIs
// ======================
export const adminAPI = {
  getAllUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient(`/admin/users?${queryString}`);
  },

  updateUser: async (userId, userData) => {
    return apiClient(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (userId) => {
    return apiClient(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  getAllAttendance: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient(`/admin/attendance?${queryString}`);
  },

  getDashboardStats: async () => {
    return apiClient('/admin/dashboard-stats');
  },

  getUserLogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiClient(`/admin/logs?${queryString}`);
  },
};