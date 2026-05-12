import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import attendanceRoutes from "./attendance.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function createRateLimiter({ windowMs, maxRequests }) {
  const buckets = new Map();

  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many requests" });
    }

    return next();
  };
}

app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(
  "/attendance",
  createRateLimiter({ windowMs: 60 * 1000, maxRequests: 60 }),
  attendanceRoutes
);

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running" });
});

app.use((err, _req, res, next) => {
  void next;
  console.error("Unhandled server error:", err);
  res.status(500).json({ message: "Server error" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
