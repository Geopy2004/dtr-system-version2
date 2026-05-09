import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ======================
// AUTH MIDDLEWARE (FIXED)
// ======================
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).json({ message: "Auth failed" });
  }
};

// ======================
// TIME IN
// ======================
router.post("/timein", auth, async (req, res) => {
  try {
    const { location, notes } = req.body;

    const { data, error } = await supabase
      .from("attendance")
      .insert([
        {
          user_id: req.user.id,
          location: location || "Office",
          notes: notes || "",
          time_in: new Date(),
          time_out: null,
          status: "present",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("DB ERROR:", error);
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: "Time In successful", data });
  } catch (err) {
    console.error("TIME IN ERROR:", err);
    res.status(500).json({ message: "Time In failed" });
  }
});

// ======================
// TIME OUT
// ======================
router.post("/timeout", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .update({ time_out: new Date() })
      .eq("user_id", req.user.id)
      .is("time_out", null)
      .select()
      .single();

    if (error) {
      console.error("DB ERROR:", error);
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: "Time Out successful", data });
  } catch (err) {
    console.error("TIME OUT ERROR:", err);
    res.status(500).json({ message: "Time Out failed" });
  }
});

// ======================
// GET MY ATTENDANCE
// ======================
router.get("/my-attendance", auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", req.user.id)
      .order("time_in", { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ attendance: data });
  } catch (err) {
    res.status(500).json({ message: "Fetch failed" });
  }
});

export default router;