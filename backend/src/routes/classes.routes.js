
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET all active classes
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const result = await pool.query(`
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
        WHERE c.is_active = TRUE
        ORDER BY c.class_name ASC
      `);

      res.json({
        success: true,
        count: result.rows.length,
        classes: result.rows,
      });
    } catch (error) {
      console.error("Get classes error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve classes.",
      });
    }
  }
);

// GET one class by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      const result = await pool.query(
        `SELECT
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
         WHERE c.id = $1 AND c.is_active = TRUE`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Class not found.",
        });
      }

      res.json({
        success: true,
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Get class error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve class.",
      });
    }
  }
);

// CREATE a class
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { class_name, academic_year, teacher_id } = req.body;

      if (!class_name?.trim() || !academic_year?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Class name and academic year are required.",
        });
      }

      if (class_name.trim().length > 100 || academic_year.trim().length > 20) {
        return res.status(400).json({
          success: false,
          message: "Class name or academic year is too long.",
        });
      }

      let assignedTeacherId = null;

      if (teacher_id !== undefined && teacher_id !== null && teacher_id !== "") {
        if (!Number.isInteger(Number(teacher_id)) || Number(teacher_id) < 1) {
          return res.status(400).json({
            success: false,
            message: "Invalid teacher ID.",
          });
        }

        const teacher = await pool.query(
          `SELECT t.id
           FROM teachers t
           JOIN users u ON t.user_id = u.id
           WHERE t.id = $1 AND u.is_active = TRUE`,
          [teacher_id]
        );

        if (teacher.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Teacher not found or inactive.",
          });
        }

        assignedTeacherId = Number(teacher_id);
      }

      const result = await pool.query(
        `INSERT INTO classes (class_name, academic_year, teacher_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [class_name.trim(), academic_year.trim(), assignedTeacherId]
      );

      res.status(201).json({
        success: true,
        message: "Class created successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This class already exists for that academic year.",
        });
      }

      console.error("Create class error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create class.",
      });
    }
  }
);

// UPDATE a class
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { class_name, academic_year, teacher_id } = req.body;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      if (!class_name?.trim() || !academic_year?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Class name and academic year are required.",
        });
      }

      if (class_name.trim().length > 100 || academic_year.trim().length > 20) {
        return res.status(400).json({
          success: false,
          message: "Class name or academic year is too long.",
        });
      }

      let assignedTeacherId = null;

      if (teacher_id !== undefined && teacher_id !== null && teacher_id !== "") {
        if (!Number.isInteger(Number(teacher_id)) || Number(teacher_id) < 1) {
          return res.status(400).json({
            success: false,
            message: "Invalid teacher ID.",
          });
        }

        const teacher = await pool.query(
          `SELECT t.id
           FROM teachers t
           JOIN users u ON t.user_id = u.id
           WHERE t.id = $1 AND u.is_active = TRUE`,
          [teacher_id]
        );

        if (teacher.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Teacher not found or inactive.",
          });
        }

        assignedTeacherId = Number(teacher_id);
      }

      const result = await pool.query(
        `UPDATE classes
         SET class_name = $1,
             academic_year = $2,
             teacher_id = $3
         WHERE id = $4 AND is_active = TRUE
         RETURNING *`,
        [class_name.trim(), academic_year.trim(), assignedTeacherId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active class not found.",
        });
      }

      res.json({
        success: true,
        message: "Class updated successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This class already exists for that academic year.",
        });
      }

      console.error("Update class error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update class.",
      });
    }
  }
);

// DEACTIVATE a class instead of permanently deleting it
router.patch(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      const result = await pool.query(
        `UPDATE classes
         SET is_active = FALSE
         WHERE id = $1 AND is_active = TRUE
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active class not found.",
        });
      }

      res.json({
        success: true,
        message: "Class deactivated successfully.",
        class: result.rows[0],
      });
    } catch (error) {
      console.error("Deactivate class error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to deactivate class.",
      });
    }
  }
);

export default router;
