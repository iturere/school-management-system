
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

const validTypes = ["assignment", "test", "exam"];

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

const isValidScore = (score, maximumScore) => {
  if (
    (typeof score !== "number" && typeof score !== "string") ||
    (typeof maximumScore !== "number" &&
      typeof maximumScore !== "string") ||
    String(score).trim() === "" ||
    String(maximumScore).trim() === ""
  ) {
    return false;
  }

  const parsedScore = Number(score);
  const parsedMaximum = Number(maximumScore);

  return (
    Number.isFinite(parsedScore) &&
    Number.isFinite(parsedMaximum) &&
    parsedScore >= 0 &&
    parsedMaximum > 0 &&
    parsedScore <= parsedMaximum
  );
};



// GET /api/grades/my
// Student: view only their own grades
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           g.id,
           g.student_id,
           g.class_id,
           c.class_name,
           g.subject,
           g.assessment_type,
           g.score,
           g.maximum_score,
           ROUND(
             (g.score::numeric / NULLIF(g.maximum_score, 0)) * 100,
             2
           ) AS percentage,
           g.assessment_date
         FROM grades g
         JOIN students s ON s.id = g.student_id
         JOIN classes c ON c.id = g.class_id
         WHERE s.user_id = $1
           AND EXISTS (
             SELECT 1
             FROM enrollments e
             WHERE e.student_id = g.student_id
               AND e.class_id = g.class_id
               AND e.status = 'active'
           )
         ORDER BY g.assessment_date DESC, g.id DESC`,
        [req.user.id]
      );

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        grades: result.rows,
      });
    } catch (error) {
      console.error("Get student grades error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve your grades.",
      });
    }
  }
);


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

      if (student_id && !isValidId(student_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      if (class_id && !isValidId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      if (subject !== undefined && (
        typeof subject !== "string" ||
        subject.length > 100
      )) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject filter.",
        });
      }

      if (assessment_type && !validTypes.includes(assessment_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assessment type.",
        });
      }

      const result = await pool.query(
        `SELECT
           g.id,
           g.student_id,
           u.full_name AS student_name,
           s.admission_number,
           g.class_id,
           c.class_name,
           g.subject,
           g.assessment_type,
           g.score,
           g.maximum_score,
           g.assessment_date
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
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $6
                 AND t.id = c.teacher_id
             )
           )
         ORDER BY g.assessment_date DESC, g.id DESC`,
        [
          student_id ? Number(student_id) : null,
          class_id ? Number(class_id) : null,
          subject || null,
          assessment_type || null,
          req.user.role,
          req.user.id,
        ]
      );

      return res.json({
        success: true,
        count: result.rows.length,
        grades: result.rows,
      });
    } catch (error) {
      console.error("Get grades error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve grades.",
      });
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

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid grade ID.",
        });
      }

      const result = await pool.query(
        `SELECT
           g.id,
           g.student_id,
           u.full_name AS student_name,
           s.admission_number,
           g.class_id,
           c.class_name,
           g.subject,
           g.assessment_type,
           g.score,
           g.maximum_score,
           g.assessment_date
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN users u ON s.user_id = u.id
         JOIN classes c ON g.class_id = c.id
         WHERE g.id = $1
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
          message: "Grade not found.",
        });
      }

      return res.json({
        success: true,
        grade: result.rows[0],
      });
    } catch (error) {
      console.error("Get grade error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve grade.",
      });
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

      if (!isValidId(student_id) || !isValidId(class_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid student_id and class_id are required.",
        });
      }

      if (
        typeof subject !== "string" ||
        !subject.trim() ||
        subject.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject is required and must not exceed 100 characters.",
        });
      }

      if (!validTypes.includes(assessment_type)) {
        return res.status(400).json({
          success: false,
          message: "Assessment type must be assignment, test, or exam.",
        });
      }

      if (!isValidScore(score, maximum_score)) {
        return res.status(400).json({
          success: false,
          message: "Enter valid scores. Score must be between zero and maximum_score.",
        });
      }

      if (
        assessment_date !== undefined &&
        assessment_date !== null &&
        assessment_date !== "" &&
        !isValidDate(assessment_date)
      ) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid assessment date in YYYY-MM-DD format.",
        });
      }

      const result = await pool.query(
        `INSERT INTO grades
           (student_id, class_id, subject, assessment_type,
            score, maximum_score, assessment_date)
         SELECT
           e.student_id,
           e.class_id,
           $3,
           $4,
           $5,
           $6,
           COALESCE($7::date, CURRENT_DATE)
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
             $8 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $9
                 AND t.id = c.teacher_id
             )
           )
         RETURNING *`,
        [
          Number(student_id),
          Number(class_id),
          subject.trim(),
          assessment_type,
          Number(score),
          Number(maximum_score),
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

      return res.status(201).json({
        success: true,
        message: "Grade recorded successfully.",
        grade: result.rows[0],
      });
    } catch (error) {
      if (error.code === "22008" || error.code === "22007") {
        return res.status(400).json({
          success: false,
          message: "Invalid assessment date.",
        });
      }

      console.error("Create grade error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to record grade.",
      });
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

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid grade ID.",
        });
      }

      if (!isValidScore(score, maximum_score)) {
        return res.status(400).json({
          success: false,
          message: "Provide valid scores. Score cannot exceed maximum_score.",
        });
      }

      const result = await pool.query(
        `UPDATE grades g
         SET score = $1,
             maximum_score = $2
         FROM classes c
         WHERE g.id = $3
           AND c.id = g.class_id
           AND c.is_active = TRUE
           AND (
             $4 = 'admin'
             OR EXISTS (
               SELECT 1
               FROM teachers t
               WHERE t.user_id = $5
                 AND t.id = c.teacher_id
             )
           )
         RETURNING g.*`,
        [
          Number(score),
          Number(maximum_score),
          id,
          req.user.role,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Grade not found, class inactive, or access denied.",
        });
      }

      return res.json({
        success: true,
        message: "Grade updated successfully.",
        grade: result.rows[0],
      });
    } catch (error) {
      console.error("Update grade error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update grade.",
      });
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

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid grade ID.",
        });
      }

      const result = await pool.query(
        "DELETE FROM grades WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Grade not found.",
        });
      }

      return res.json({
        success: true,
        message: "Grade deleted successfully.",
      });
    } catch (error) {
      console.error("Delete grade error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete grade.",
      });
    }
  }
);

export default router;
