
import bcrypt from "bcrypt";
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/teachers
// Retrieve and search teachers
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const search = req.query.search?.trim() || null;

      const result = await pool.query(
        `SELECT
          t.id,
          t.employee_number,
          u.full_name,
          u.email,
          t.phone,
          t.qualification,
          t.hire_date,
          t.created_at
         FROM teachers t
         INNER JOIN users u ON t.user_id = u.id
         WHERE (
           $1::text IS NULL
           OR u.full_name ILIKE '%' || $1 || '%'
           OR u.email ILIKE '%' || $1 || '%'
           OR t.employee_number ILIKE '%' || $1 || '%'
         )
         ORDER BY t.id ASC`,
        [search]
      );

      res.status(200).json({
        success: true,
        count: result.rows.length,
        teachers: result.rows,
      });
    } catch (error) {
      console.error("Teacher retrieval error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve teachers.",
      });
    }
  }
);



// GET /api/teachers/:id
// Retrieve one teacher by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          t.id,
          t.employee_number,
          u.full_name,
          u.email,
          t.phone,
          t.qualification,
          t.hire_date,
          u.is_active,
          t.created_at
         FROM teachers t
         INNER JOIN users u ON t.user_id = u.id
         WHERE t.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found.",
        });
      }

      res.status(200).json({
        success: true,
        teacher: result.rows[0],
      });
    } catch (error) {
      console.error("Teacher retrieval error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve teacher.",
      });
    }
  }
);




// PUT /api/teachers/:id
// Update teacher information — Admin only
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    const {
      full_name,
      email,
      employee_number,
      phone,
      qualification,
      hire_date,
    } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof employee_number !== "string" ||
      !full_name.trim() ||
      !email.trim() ||
      !employee_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and employee number are required.",
      });
    }

    if (full_name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must not exceed 150 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    try {
      const result = await pool.query(
        `UPDATE users u
         SET full_name = $1,
             email = $2,
             updated_at = CURRENT_TIMESTAMP
         FROM teachers t
         WHERE t.user_id = u.id
           AND t.id = $3
         RETURNING u.id, t.id AS teacher_id`,
        [full_name.trim(), email.trim().toLowerCase(), id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found.",
        });
      }

      await pool.query(
        `UPDATE teachers
         SET employee_number = $1,
             phone = $2,
             qualification = $3,
             hire_date = $4
         WHERE id = $5`,
        [
          employee_number.trim(),
          phone || null,
          qualification || null,
          hire_date || null,
          id,
        ]
      );

      res.status(200).json({
        success: true,
        message: "Teacher updated successfully.",
      });
    } catch (error) {
      console.error("Teacher update error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Email or employee number already exists.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update teacher.",
      });
    }
  }
);




// PATCH /api/teachers/:id/deactivate
// Deactivate a teacher account — Admin only
router.patch(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID.",
      });
    }

    try {
      const result = await pool.query(
        `UPDATE users u
         SET is_active = FALSE,
             updated_at = CURRENT_TIMESTAMP
         FROM teachers t
         WHERE t.user_id = u.id
           AND t.id = $1
           AND u.is_active = TRUE
         RETURNING u.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Active teacher not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Teacher account deactivated successfully.",
      });
    } catch (error) {
      console.error("Teacher deactivation error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to deactivate teacher.",
      });
    }
  }
);


// POST /api/teachers
// Register a teacher — Admin only
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const {
      full_name,
      email,
      password,
      employee_number,
      phone,
      qualification,
      hire_date,
    } = req.body;

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof employee_number !== "string" ||
      !full_name.trim() ||
      !email.trim() ||
      !password ||
      !employee_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and employee number are required.",
      });
    }

    if (full_name.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must not exceed 150 characters.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must contain between 8 and 72 characters.",
      });
    }

    if (employee_number.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Employee number must not exceed 50 characters.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `INSERT INTO users
          (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'teacher')
         RETURNING id`,
        [
          full_name.trim(),
          email.trim().toLowerCase(),
          passwordHash,
        ]
      );

      const userId = userResult.rows[0].id;

      const teacherResult = await client.query(
        `INSERT INTO teachers
          (user_id, employee_number, phone, qualification, hire_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          employee_number.trim(),
          phone || null,
          qualification || null,
          hire_date || null,
        ]
      );

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Teacher registered successfully.",
        teacher: {
          ...teacherResult.rows[0],
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Teacher registration error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Email or employee number already exists.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to register teacher.",
      });
    } finally {
      client.release();
    }
  }
);


// REACTIVATE a teacher account
router.patch(
  "/:id/reactivate",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacher ID.",
        });
      }

      const result = await pool.query(
        `UPDATE users u
         SET is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         FROM teachers t
         WHERE t.user_id = u.id
           AND t.id = $1
           AND u.is_active = FALSE
         RETURNING t.id, t.employee_number, u.full_name, u.email, u.is_active`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Inactive teacher not found.",
        });
      }

      res.json({
        success: true,
        message: "Teacher reactivated successfully.",
        teacher: result.rows[0],
      });
    } catch (error) {
      console.error("Reactivate teacher error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reactivate teacher.",
      });
    }
  }
);


export default router;
