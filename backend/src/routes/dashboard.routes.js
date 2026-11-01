
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




// GET /api/dashboard/student
// Return dashboard information for the logged-in student only.
router.get(
  "/student",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const studentResult = await pool.query(
        `SELECT
           s.id,
           s.admission_number,
           s.date_of_birth,
           s.gender,
           s.phone,
           s.address,
           u.full_name,
           u.email
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.user_id = $1
           AND u.is_active = TRUE`,
        [req.user.id]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student profile not found.",
        });
      }

      const student = studentResult.rows[0];

      const enrollmentResult = await pool.query(
        `SELECT
           e.id,
           e.enrollment_date,
           e.status,
           c.id AS class_id,
           c.class_name,
           c.academic_year
         FROM enrollments e
         JOIN classes c ON c.id = e.class_id
         WHERE e.student_id = $1
           AND e.status = 'active'
           AND c.is_active = TRUE
         ORDER BY c.class_name`,
        [student.id]
      );

      const attendanceResult = await pool.query(
        `SELECT
           COUNT(*)::int AS total_records,
           COUNT(*) FILTER (
             WHERE a.status = 'present'
           )::int AS present,
           COUNT(*) FILTER (
             WHERE a.status = 'absent'
           )::int AS absent,
           COUNT(*) FILTER (
             WHERE a.status = 'late'
           )::int AS late
         FROM attendance a
         JOIN enrollments e
           ON e.student_id = a.student_id
          AND e.class_id = a.class_id
         WHERE e.student_id = $1
           AND e.status = 'active'`,
        [student.id]
      );

      return res.status(200).json({
        success: true,
        student,
        classes: enrollmentResult.rows,
        attendance: attendanceResult.rows[0],
      });
    } catch (error) {
      console.error("Student dashboard error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not load student dashboard.",
      });
    }
  }
);



export default router;
