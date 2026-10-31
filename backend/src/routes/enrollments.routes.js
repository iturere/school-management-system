
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

const validStatuses = ["active", "completed", "withdrawn"];

// Validate positive integer IDs
const isValidId = (value) =>
  /^[1-9]\d*$/.test(String(value)) &&
  Number.isSafeInteger(Number(value));

// Validate real calendar dates in YYYY-MM-DD format
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

// GET all enrollments
// Admin: all enrollments
// Teacher: enrollments in assigned classes
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { status } = req.query;

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment status.",
        });
      }

      const result = await pool.query(
        `SELECT
           e.id,
           e.student_id,
           u.full_name AS student_name,
           s.admission_number,
           e.class_id,
           c.class_name,
           c.academic_year,
           e.enrollment_date,
           e.status,
           e.created_at
         FROM enrollments e
         JOIN students s ON e.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON e.class_id = c.id
         WHERE
           (
             $1 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $2
                 AND t.id = c.teacher_id
             )
           )
           AND ($3::varchar IS NULL OR e.status = $3)
         ORDER BY e.id DESC`,
        [req.user.role, req.user.id, status || null]
      );

      return res.json({
        success: true,
        count: result.rows.length,
        enrollments: result.rows,
      });
    } catch (error) {
      console.error("Get enrollments error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve enrollments.",
      });
    }
  }
);

// GET one enrollment by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      const result = await pool.query(
        `SELECT
           e.id,
           e.student_id,
           u.full_name AS student_name,
           s.admission_number,
           e.class_id,
           c.class_name,
           c.academic_year,
           e.enrollment_date,
           e.status,
           e.created_at
         FROM enrollments e
         JOIN students s ON e.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON e.class_id = c.id
         WHERE e.id = $1
           AND (
             $2 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $3
                 AND t.id = c.teacher_id
             )
           )`,
        [id, req.user.role, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      return res.json({
        success: true,
        enrollment: result.rows[0],
      });
    } catch (error) {
      console.error("Get enrollment error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve enrollment.",
      });
    }
  }
);

// ENROLL a student in a class
// Admin only
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { student_id, class_id, enrollment_date } = req.body;

      if (!isValidId(student_id) || !isValidId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid student_id and class_id are required.",
        });
      }

      if (
        enrollment_date !== undefined &&
        enrollment_date !== null &&
        enrollment_date !== "" &&
        !isValidDate(enrollment_date)
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid enrollment date in YYYY-MM-DD format.",
        });
      }

      // Insert only when both student and class are active.
      const result = await pool.query(
        `INSERT INTO enrollments
           (student_id, class_id, enrollment_date)
         SELECT
           s.id,
           c.id,
           COALESCE($3::date, CURRENT_DATE)
         FROM students s
         JOIN users u ON s.user_id = u.id
         CROSS JOIN classes c
         WHERE s.id = $1
           AND u.is_active = TRUE
           AND c.id = $2
           AND c.is_active = TRUE
         RETURNING *`,
        [
          Number(student_id),
          Number(class_id),
          enrollment_date || null,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student or class not found or inactive.",
        });
      }

      return res.status(201).json({
        success: true,
        message: "Student enrolled successfully.",
        enrollment: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This student is already enrolled in this class.",
        });
      }

      if (error.code === "22008" || error.code === "22007") {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment date.",
        });
      }

      console.error("Create enrollment error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to enroll student.",
      });
    }
  }
);

// UPDATE enrollment status
// Admin only
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment ID.",
        });
      }

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be active, completed, or withdrawn.",
        });
      }

      const result = await pool.query(
        `UPDATE enrollments
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found.",
        });
      }

      return res.json({
        success: true,
        message: "Enrollment status updated successfully.",
        enrollment: result.rows[0],
      });
    } catch (error) {
      console.error("Update enrollment status error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update enrollment status.",
      });
    }
  }
);

export default router;
