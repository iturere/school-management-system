
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// --------------------------------------------------
// VALIDATION HELPERS
// --------------------------------------------------

const isValidId = (id) => /^[1-9]\d*$/.test(id);

const validateClassInput = (class_name, academic_year) => {
  if (
    typeof class_name !== "string" ||
    typeof academic_year !== "string" ||
    !class_name.trim() ||
    !academic_year.trim()
  ) {
    return "Class name and academic year are required.";
  }

  if (class_name.trim().length > 100 || academic_year.trim().length > 20) {
    return "Class name or academic year is too long.";
  }

  return null;
};

const validateTeacherId = async (teacher_id) => {
  if (
    teacher_id === undefined ||
    teacher_id === null ||
    teacher_id === ""
  ) {
    return { valid: true, value: null };
  }

  const id = String(teacher_id);

  if (!isValidId(id)) {
    return { valid: false, message: "Invalid teacher ID." };
  }

  const result = await pool.query(
    `
    SELECT t.id
    FROM teachers t
    INNER JOIN users u ON t.user_id = u.id
    WHERE t.id = $1
      AND u.is_active = TRUE
    `,
    [id]
  );

  if (result.rows.length === 0) {
    return {
      valid: false,
      message: "Teacher not found or inactive.",
    };
  }

  return { valid: true, value: Number(id) };
};

// --------------------------------------------------
// GET /api/classes
// Admin: all classes, including inactive if requested.
// Teacher: only their assigned active classes.
// --------------------------------------------------

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const includeInactive = req.query.include_inactive === "true";

      let whereClause = "";
      const values = [];

      if (req.user.role === "teacher") {
        values.push(req.user.id);

        whereClause = `
          WHERE c.is_active = TRUE
            AND t.user_id = $1
        `;
      } else if (!includeInactive) {
        whereClause = "WHERE c.is_active = TRUE";
      }

      const result = await pool.query(
        `
        SELECT
          c.id,
          c.class_name,
          c.academic_year,
          c.teacher_id,
          c.is_active,
          t.employee_number,
          u.full_name AS teacher_name
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN users u ON t.user_id = u.id
        ${whereClause}
        ORDER BY c.class_name ASC, c.academic_year DESC
        `,
        values
      );

      res.status(200).json({
        success: true,
        count: result.rows.length,
        classes: result.rows,
      });
    } catch (error) {
      console.error("Get classes error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve classes.",
      });
    }
  }
);

// --------------------------------------------------
// GET /api/classes/:id
// Admin: retrieve any class.
// Teacher: retrieve only their assigned active class.
// --------------------------------------------------

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    try {
      const values = [id];

      let accessCondition = "";

      if (req.user.role === "teacher") {
        values.push(req.user.id);

        accessCondition = `
          AND t.user_id = $2
          AND c.is_active = TRUE
        `;
      }

      const result = await pool.query(
        `
        SELECT
          c.id,
          c.class_name,
          c.academic_year,
          c.teacher_id,
          c.is_active,
          t.employee_number,
          u.full_name AS teacher_name
        FROM classes c
        LEFT JOIN teachers t ON c.teacher_id = t.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE c.id = $1
        ${accessCondition}
        `,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Class not found.",
        });
      }

      res.status(200).json({
        success: true,
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Get class error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve class.",
      });
    }
  }
);

// --------------------------------------------------
// POST /api/classes
// Create a class — Admin only
// --------------------------------------------------

router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { class_name, academic_year, teacher_id } = req.body;

      const validationError = validateClassInput(
        class_name,
        academic_year
      );

      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError,
        });
      }

      const teacherValidation = await validateTeacherId(teacher_id);

      if (!teacherValidation.valid) {
        return res.status(400).json({
          success: false,
          message: teacherValidation.message,
        });
      }

      const result = await pool.query(
        `
        INSERT INTO classes (
          class_name,
          academic_year,
          teacher_id
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
          class_name.trim(),
          academic_year.trim(),
          teacherValidation.value,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Class created successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Create class error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This class already exists for that academic year.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create class.",
      });
    }
  }
);

// --------------------------------------------------
// PUT /api/classes/:id
// Update a class — Admin only
// --------------------------------------------------

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { class_name, academic_year, teacher_id } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    const validationError = validateClassInput(
      class_name,
      academic_year
    );

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    try {
      const teacherValidation = await validateTeacherId(teacher_id);

      if (!teacherValidation.valid) {
        return res.status(400).json({
          success: false,
          message: teacherValidation.message,
        });
      }

      const result = await pool.query(
        `
        UPDATE classes
        SET
          class_name = $1,
          academic_year = $2,
          teacher_id = $3
        WHERE id = $4
          AND is_active = TRUE
        RETURNING *
        `,
        [
          class_name.trim(),
          academic_year.trim(),
          teacherValidation.value,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active class not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Class updated successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Update class error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This class already exists for that academic year.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update class.",
      });
    }
  }
);

// --------------------------------------------------
// PATCH /api/classes/:id/deactivate
// Deactivate a class — Admin only
// --------------------------------------------------

router.patch(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    try {
      // Do not deactivate a class with active enrollments.
      const enrollmentCheck = await pool.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM enrollments
          WHERE class_id = $1
            AND status = 'active'
        ) AS has_active_enrollments
        `,
        [id]
      );

      if (enrollmentCheck.rows[0].has_active_enrollments) {
        return res.status(409).json({
          success: false,
          message:
            "This class has active student enrollments. Complete or withdraw those enrollments before deactivating the class.",
        });
      }

      const result = await pool.query(
        `
        UPDATE classes
        SET is_active = FALSE
        WHERE id = $1
          AND is_active = TRUE
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active class not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Class deactivated successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Deactivate class error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to deactivate class.",
      });
    }
  }
);

// --------------------------------------------------
// PATCH /api/classes/:id/reactivate
// Reactivate a class — Admin only
// --------------------------------------------------

router.patch(
  "/:id/reactivate",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID.",
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE classes
        SET is_active = TRUE
        WHERE id = $1
          AND is_active = FALSE
        RETURNING
          id,
          class_name,
          academic_year,
          teacher_id,
          is_active
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Inactive class not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Class reactivated successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Reactivate class error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to reactivate class.",
      });
    }
  }
);

export default router;
