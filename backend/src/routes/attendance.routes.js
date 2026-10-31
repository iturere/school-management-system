
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

const validStatuses = ["present", "absent", "late", "excused"];

const isValidId = (value) =>
  /^[1-9]\d*$/.test(String(value)) &&
  Number.isSafeInteger(Number(value));

const isValidDate = (value) => {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// GET attendance records
// Admin: all records
// Teacher: records for assigned classes
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { class_id, attendance_date, status } = req.query;

      if (class_id && !isValidId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status.",
        });
      }

      if (attendance_date && !isValidDate(attendance_date)) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid date in YYYY-MM-DD format.",
        });
      }

      const result = await pool.query(
        `SELECT
           a.id,
           a.student_id,
           u.full_name AS student_name,
           s.admission_number,
           a.class_id,
           c.class_name,
           a.attendance_date,
           a.status
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON a.class_id = c.id
         WHERE ($1::int IS NULL OR a.class_id = $1)
           AND ($2::date IS NULL OR a.attendance_date = $2)
           AND ($3::varchar IS NULL OR a.status = $3)
           AND (
             $4 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $5
                 AND t.id = c.teacher_id
             )
           )
         ORDER BY a.attendance_date DESC, a.id DESC`,
        [
          class_id ? Number(class_id) : null,
          attendance_date || null,
          status || null,
          req.user.role,
          req.user.id,
        ]
      );

      return res.json({
        success: true,
        count: result.rows.length,
        attendance: result.rows,
      });
    } catch (error) {
      console.error("Get attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve attendance.",
      });
    }
  }
);

// RECORD attendance
// Admin and assigned teacher
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { student_id, class_id, attendance_date, status } = req.body;

      if (!isValidId(student_id) || !isValidId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid student_id and class_id are required.",
        });
      }

      if (!isValidDate(attendance_date)) {
        return res.status(400).json({
          success: false,
          message: "A valid attendance date in YYYY-MM-DD format is required.",
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be present, absent, late, or excused.",
        });
      }

      const result = await pool.query(
        `INSERT INTO attendance
           (student_id, class_id, attendance_date, status)
         SELECT
           e.student_id,
           e.class_id,
           $3::date,
           $4
         FROM enrollments e
         JOIN students s ON s.id = e.student_id
         JOIN users u ON u.id = s.user_id
         JOIN classes c ON c.id = e.class_id
         WHERE e.student_id = $1
           AND e.class_id = $2
           AND e.status = 'active'
           AND u.is_active = TRUE
           AND c.is_active = TRUE
           AND (
             $5 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $6
                 AND t.id = c.teacher_id
             )
           )
         RETURNING *`,
        [
          Number(student_id),
          Number(class_id),
          attendance_date,
          status,
          req.user.role,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active enrollment or authorized class not found.",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Attendance recorded successfully.",
        attendance: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Attendance has already been recorded for this student, class, and date.",
        });
      }

      if (error.code === "22008" || error.code === "22007") {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance date.",
        });
      }

      console.error("Record attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to record attendance.",
      });
    }
  }
);

// UPDATE attendance status
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance ID.",
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be present, absent, late, or excused.",
        });
      }

      const result = await pool.query(
        `UPDATE attendance a
         SET status = $1
         FROM classes c
         WHERE a.id = $2
           AND c.id = a.class_id
           AND c.is_active = TRUE
           AND (
             $3 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $4
                 AND t.id = c.teacher_id
             )
           )
         RETURNING a.*`,
        [status, id, req.user.role, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found, class inactive, or access denied.",
        });
      }

      return res.json({
        success: true,
        message: "Attendance updated successfully.",
        attendance: result.rows[0],
      });
    } catch (error) {
      console.error("Update attendance error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update attendance.",
      });
    }
  }
);

export default router;
