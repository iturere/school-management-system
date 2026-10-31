
import pool from "./config/database.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Allow frontend requests
app.use(cors());

// Read JSON request bodies
app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "School Management System API is running!",
    version: "1.0.0",
  });
});

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "Healthy",
    message: "Backend server is working correctly.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});





// Test PostgreSQL connection
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "PostgreSQL connected successfully!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});