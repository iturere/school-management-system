import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

const validTypes = ["assignment", "test", "exam"];

const validId = (value) => /^[1-9]\d*$/.test(String(value));

// GET grades
// Admin: all grades
// Teacher: grades in assigned classes
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { student_id, class_id, subject, assessment_type } = req.query;

      if (student_id && !validId(student_id)) {
        return res.status(400).json({ success: false, message: "Invalid student ID." });
      }

      if (class_id && !validId(class_id)) {
        return res.status(400).json({ success: false, message: "Invalid class ID." });
      }

      if (assessment_type && !validTypes.includes(assessment_type)) {
        return res.status(400).json({ success: false, message: "Invalid assessment type." });
      }

      const result = await pool.query(
        `SELECT g.id, g.student_id, u.full_name AS student_name,
                s.admission_number, g.class_id, c.class_name,
                g.subject, g.assessment_type, g.score,
                g.maximum_score, g.assessment_date
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON g.class_id = c.id
         WHERE ($1::int IS NULL OR g.student_id = $1)
           AND ($2::int IS NULL OR g.class_id = $2)
           AND ($3::varchar IS NULL OR g.subject ILIKE '%' || $3 || '%')
           AND ($4::varchar IS NULL OR g.assessment_type = $4)
           AND (
             $5 = 'admin'
             OR EXISTS (
               SELECT 1 FROM teachers t
               WHERE t.user_id = $6 AND t.id = c.teacher_id
             )
           )
         ORDER BY g.assessment_date DESC, g.id DESC`,
        [
          student_id || null,
          class_id || null,
          subject || null,
          assessment_type || null,
          req.user.role,
          req.user.id,
        ]
      );

      res.json({
        success: true,
        count: result.rows.length,
        grades: result.rows,
      });
    } catch (error) {
      console.error("Get grades error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve grades." });
    }
  }
);

// GET one grade
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!validId(id)) {
        return res.status(400).json({ success: false, message: "Invalid grade ID." });
      }

      const result = await pool.query(
        `SELECT g.id, g.student_id, u.full_name AS student_name,
                s.admission_number, g.class_id, c.class_name,
                g.subject, g.assessment_type, g.score,
                g.maximum_score, g.assessment_date
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON g.class_id = c.id
         WHERE g.id = $1
           AND (
             $2 = 'admin'
             OR EXISTS (
               SELECT 1 FROM teachers t
               WHERE t.user_id = $3 AND t.id = c.teacher_id
             )
           )`,
        [id, req.user.role, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Grade not found." });
      }

      res.json({ success: true, grade: result.rows[0] });
    } catch (error) {
      console.error("Get grade error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve grade." });
    }
  }
);

// CREATE grade
// Admin and assigned teacher
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const {
        student_id,
        class_id,
        subject,
        assessment_type,
        score,
        maximum_score,
        assessment_date,
      } = req.body;

      if (!validId(student_id) || !validId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid student_id and class_id are required.",
        });
      }

      if (typeof subject !== "string" || !subject.trim()) {
        return res.status(400).json({
          success: false,
          message: "Subject is required.",
        });
      }

      if (subject.trim().length > 100) {
        return res.status(400).json({
          success: false,
          message: "Subject must not exceed 100 characters.",
        });
      }

      if (!validTypes.includes(assessment_type)) {
        return res.status(400).json({
          success: false,
          message: "Assessment type must be assignment, test, or exam.",
        });
      }

      if (
        score === undefined ||
        maximum_score === undefined ||
        !Number.isFinite(Number(score)) ||
        !Number.isFinite(Number(maximum_score)) ||
        Number(score) < 0 ||
        Number(maximum_score) <= 0 ||
        Number(score) > Number(maximum_score)
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter valid scores. Score must be between zero and maximum_score.",
        });
      }

      if (
        assessment_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(assessment_date)
      ) {
        return res.status(400).json({
          success: false,
          message: "Assessment date must use YYYY-MM-DD format.",
        });
      }

      const result = await pool.query(
        `INSERT INTO grades
           (student_id, class_id, subject, assessment_type,
            score, maximum_score, assessment_date)
         SELECT e.student_id, e.class_id, $3, $4, $5, $6,
                COALESCE($7::date, CURRENT_DATE)
         FROM enrollments e
         JOIN classes c ON c.id = e.class_id
         WHERE e.student_id = $1
           AND e.class_id = $2
           AND e.status = 'active'
           AND c.is_active = TRUE
           AND (
             $8 = 'admin'
             OR EXISTS (
               SELECT 1 FROM teachers t
               WHERE t.user_id = $9 AND t.id = c.teacher_id
             )
           )
         RETURNING *`,
        [
          student_id,
          class_id,
          subject.trim(),
          assessment_type,
          score,
          maximum_score,
          assessment_date || null,
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

      res.status(201).json({
        success: true,
        message: "Grade recorded successfully.",
        grade: result.rows[0],
      });
    } catch (error) {
      console.error("Create grade error:", error);
      res.status(500).json({ success: false, message: "Failed to record grade." });
    }
  }
);

// UPDATE grade score
// Admin and assigned teacher
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { score, maximum_score } = req.body;

      if (!validId(id)) {
        return res.status(400).json({ success: false, message: "Invalid grade ID." });
      }

      if (
        score === undefined ||
        maximum_score === undefined ||
        !Number.isFinite(Number(score)) ||
        !Number.isFinite(Number(maximum_score)) ||
        Number(score) < 0 ||
        Number(maximum_score) <= 0 ||
        Number(score) > Number(maximum_score)
      ) {
        return res.status(400).json({
          success: false,
          message: "Provide valid score and maximum_score. Score cannot exceed maximum_score.",
        });
      }

      const result = await pool.query(
        `UPDATE grades g
         SET score = $1, maximum_score = $2
         FROM classes c
         WHERE g.id = $3
           AND c.id = g.class_id
           AND (
             $4 = 'admin'
             OR EXISTS (
               SELECT 1 FROM teachers t
               WHERE t.user_id = $5 AND t.id = c.teacher_id
             )
           )
         RETURNING g.*`,
        [score, maximum_score, id, req.user.role, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Grade not found or access denied.",
        });
      }

      res.json({
        success: true,
        message: "Grade updated successfully.",
        grade: result.rows[0],
      });
    } catch (error) {
      console.error("Update grade error:", error);
      res.status(500).json({ success: false, message: "Failed to update grade." });
    }
  }
);

// DELETE grade
// Admin only
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!validId(id)) {
        return res.status(400).json({ success: false, message: "Invalid grade ID." });
      }

      const result = await pool.query(
        "DELETE FROM grades WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Grade not found." });
      }

      res.json({
        success: true,
        message: "Grade deleted successfully.",
      });
    } catch (error) {
      console.error("Delete grade error:", error);
      res.status(500).json({ success: false, message: "Failed to delete grade." });
    }
  }
);

export default router;