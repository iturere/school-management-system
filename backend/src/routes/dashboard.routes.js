
import express from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/dashboard/stats
// Admin: school-wide statistics
// Teacher: statistics for assigned classes
router.get(
  "/stats",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           (
             SELECT COUNT(*)::int
             FROM students s
             JOIN users u ON u.id = s.user_id
             WHERE u.is_active = TRUE
               AND (
                 $1 = 'admin'
                 OR EXISTS (
                   SELECT 1
                   FROM enrollments e
                   JOIN classes c ON c.id = e.class_id
                   JOIN teachers t ON t.id = c.teacher_id
                   WHERE e.student_id = s.id
                     AND e.status = 'active'
                     AND c.is_active = TRUE
                     AND t.user_id = $2
                 )
               )
           ) AS students,

           (
             SELECT COUNT(*)::int
             FROM teachers t
             JOIN users u ON u.id = t.user_id
             WHERE u.is_active = TRUE
               AND (
                 $1 = 'admin'
                 OR t.user_id = $2
               )
           ) AS teachers,

           (
             SELECT COUNT(*)::int
             FROM classes c
             WHERE c.is_active = TRUE
               AND (
                 $1 = 'admin'
                 OR EXISTS (
                   SELECT 1
                   FROM teachers t
                   WHERE t.id = c.teacher_id
                     AND t.user_id = $2
                 )
               )
           ) AS classes,

           (
             SELECT COUNT(*)::int
             FROM enrollments e
             JOIN classes c ON c.id = e.class_id
             WHERE e.status = 'active'
               AND c.is_active = TRUE
               AND (
                 $1 = 'admin'
                 OR EXISTS (
                   SELECT 1
                   FROM teachers t
                   WHERE t.id = c.teacher_id
                     AND t.user_id = $2
                 )
               )
           ) AS enrollments,

           (
             SELECT COUNT(*)::int
             FROM attendance a
             JOIN classes c ON c.id = a.class_id
             WHERE (
               $1 = 'admin'
               OR EXISTS (
                 SELECT 1
                 FROM teachers t
                 WHERE t.id = c.teacher_id
                   AND t.user_id = $2
               )
             )
           ) AS attendance`,
        [req.user.role, req.user.id]
      );

      return res.status(200).json({
        success: true,
        stats: result.rows[0],
      });
    } catch (error) {
      console.error("Dashboard statistics error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load dashboard statistics.",
      });
    }
  }
);

export default router;
