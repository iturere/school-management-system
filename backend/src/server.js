
import parentsRoutes from "./routes/parents.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import pool from "./config/database.js";

import authRouter from "./routes/auth.routes.js";
import studentsRouter from "./routes/students.routes.js";
import teachersRouter from "./routes/teachers.routes.js";
import classesRouter from "./routes/classes.routes.js";
import enrollmentsRouter from "./routes/enrollments.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import gradesRouter from "./routes/grades.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Security middleware
app.use(helmet());

// Allow requests from the frontend only
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON request bodies
app.use(express.json({ limit: "10kb" }));

// Welcome route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "School Management System API is running!",
    version: "1.0.0",
  });
});

// Public health check (does not expose database information)
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "Healthy",
    message: "Backend server is working correctly.",
  });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);
app.use("/api/teachers", teachersRouter);
app.use("/api/classes", classesRouter);
app.use("/api/enrollments", enrollmentsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/grades", gradesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/parents", parentsRoutes);
// Handle unknown routes
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

// Start only after confirming database connectivity
const startServer = async () => {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error.message);
    process.exit(1);
  }
};

startServer();
