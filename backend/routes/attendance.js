/* eslint-disable no-undef */
import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ======================
// SUPABASE ADMIN CLIENT (service role — bypasses RLS)
// ======================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================
// VERIFY TOKEN MIDDLEWARE
// ======================
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// ======================
// HELPER: DETERMINE STATUS
// ======================
const getStatus = (timeIn) => {
  const date = new Date(timeIn);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const cutoffHour = 8;
  const cutoffMinute = 0;

  if (
    hours > cutoffHour ||
    (hours === cutoffHour && minutes > cutoffMinute)
  ) {
    const lateMinutes =
      (hours - cutoffHour) * 60 + (minutes - cutoffMinute);
    return { status: "late", late_minutes: lateMinutes };
  }

  return { status: "present", late_minutes: 0 };
};

// ======================
// POST /attendance/timein
// ======================
router.post("/timein", requireAuth, async (req, res) => {
  try {
    const { location = "", notes = "" } = req.body;
    const userId = req.user.id;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (existing) {
      return res
        .status(400)
        .json({ message: "Already timed in today" });
    }

    const { status, late_minutes } = getStatus(now);

    const { data, error } = await supabase
      .from("attendance")
      .insert([
        {
          user_id: userId,
          time_in: now.toISOString(),
          date: today,
          location,
          notes,
          status,
          late_minutes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Time in recorded", attendance: data });
  } catch (err) {
    console.error("Time in error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// ======================
// POST /attendance/timeout
// ======================
router.post("/timeout", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const { data: existing, error: fetchError } = await supabase
      .from("attendance")
      .select("id, time_out")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (fetchError || !existing) {
      return res
        .status(400)
        .json({ message: "No time in record found for today" });
    }

    if (existing.time_out) {
      return res
        .status(400)
        .json({ message: "Already timed out today" });
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({ time_out: now.toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: "Time out recorded", attendance: data });
  } catch (err) {
    console.error("Time out error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// ======================
// GET /attendance/my-attendance
// ======================
router.get("/my-attendance", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit } = req.query;

    let query = supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;

    const total_days = data.length;
    const present = data.filter((r) => r.status === "present").length;
    const late = data.filter((r) => r.status === "late").length;
    const total_late_minutes = data.reduce(
      (sum, r) => sum + (r.late_minutes || 0),
      0
    );

    res.json({
      attendance: data,
      stats: {
        total_days,
        present,
        late,
        total_late_minutes,
      },
    });
  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

export default router;