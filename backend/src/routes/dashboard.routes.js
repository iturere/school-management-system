
import express from "express";
import pool from "../config/database.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM students) AS students,
        (SELECT COUNT(*)::int FROM teachers) AS teachers,
        (SELECT COUNT(*)::int FROM classes WHERE is_active = TRUE) AS classes,
        (SELECT COUNT(*)::int FROM enrollments WHERE status = 'active') AS enrollments,
        (SELECT COUNT(*)::int FROM attendance) AS attendance
    `);

    res.status(200).json({
      success: true,
      stats: result.rows[0],
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not load dashboard statistics.",
    });
  }
});

export default router;
