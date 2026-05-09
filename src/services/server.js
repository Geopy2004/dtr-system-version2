import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import attendanceRoutes from "./routes/attendance.js";

dotenv.config();

const app = express();

// ======================
// MIDDLEWARE
// ======================
app.use(cors({
  origin: "http://localhost:5174", // ⚠️ IMPORTANT (your Vite port)
  credentials: true
}));

app.use(express.json());

// ======================
// ROUTES
// ======================
app.use("/attendance", attendanceRoutes);

// ======================
// TEST ROUTE
// ======================
app.get("/", (req, res) => {
  res.json({ message: "Backend is running ✔" });
});

// ======================
// START SERVER
// ======================
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});