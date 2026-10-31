
import bcrypt from "bcrypt";
import { Router } from "express";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/students
// Retrieve, search and paginate students
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const search = req.query.search?.trim() || null;

      const page = Math.max(
        1,
        Number.parseInt(req.query.page, 10) || 1
      );

      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
      );

      const offset = (page - 1) * limit;

      const searchCondition = `
        (
          $1::text IS NULL
          OR u.full_name ILIKE '%' || $1 || '%'
          OR u.email ILIKE '%' || $1 || '%'
          OR s.admission_number ILIKE '%' || $1 || '%'
        )
      `;

      const countResult = await pool.query(
        `SELECT COUNT(*)
         FROM students s
         INNER JOIN users u ON s.user_id = u.id
         WHERE ${searchCondition}`,
        [search]
      );

      const totalStudents = Number(countResult.rows[0].count);

      const result = await pool.query(
        `SELECT
          s.id,
          s.admission_number,
          u.full_name,
          u.email,
          s.date_of_birth,
          s.gender,
          s.phone,
          s.address,
          s.created_at
        FROM students s
        INNER JOIN users u ON s.user_id = u.id
        WHERE ${searchCondition}
        ORDER BY s.id ASC
        LIMIT $2 OFFSET $3`,
        [search, limit, offset]
      );

      res.status(200).json({
        success: true,
        pagination: {
          totalStudents,
          currentPage: page,
          limit,
          totalPages: Math.ceil(totalStudents / limit),
        },
        count: result.rows.length,
        students: result.rows,
      });
    } catch (error) {
      console.error("Error retrieving students:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve students.",
      });
    }
  }
);

// GET /api/students/:id
// Retrieve one student by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          s.id,
          s.admission_number,
          u.full_name,
          u.email,
          s.date_of_birth,
          s.gender,
          s.phone,
          s.address,
          s.created_at
         FROM students s
         INNER JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      res.status(200).json({
        success: true,
        student: result.rows[0],
      });
    } catch (error) {
      console.error("Error retrieving student:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve student.",
      });
    }
  }
);

// POST /api/students
// Register a new student — Admin only
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const {
      full_name,
      email,
      password,
      admission_number,
      date_of_birth,
      gender,
      phone,
      address,
    } = req.body;

    if (
      typeof full_name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof admission_number !== "string" ||
      !full_name.trim() ||
      !email.trim() ||
      !password ||
      !admission_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid name, email, password and admission number.",
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

    if (admission_number.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "Admission number must not exceed 50 characters.",
      });
    }

    if (
      gender &&
      !["Male", "Female", "Other"].includes(gender)
    ) {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male, Female or Other.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'student')
         RETURNING id`,
        [full_name.trim(), email.trim().toLowerCase(), passwordHash]
      );

      const userId = userResult.rows[0].id;

      const studentResult = await client.query(
        `INSERT INTO students
         (user_id, admission_number, date_of_birth, gender, phone, address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          admission_number.trim(),
          date_of_birth || null,
          gender || null,
          phone || null,
          address || null,
        ]
      );

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: "Student registered successfully.",
        student: {
          ...studentResult.rows[0],
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Student registration error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Email or admission number already exists.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to register student.",
      });
    } finally {
      client.release();
    }
  }
);

// PUT /api/students/:id
// Update student information — Admin only
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

    const {
      full_name,
      email,
      admission_number,
      date_of_birth,
      gender,
      phone,
      address,
    } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    if (!full_name || !email || !admission_number) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and admission number are required.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT s.id, s.user_id
         FROM students s
         WHERE s.id = $1
         FOR UPDATE`,
        [id]
      );

      if (existing.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      const userId = existing.rows[0].user_id;

      await client.query(
        `UPDATE users
         SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [full_name.trim(), email.trim().toLowerCase(), userId]
      );

      const result = await client.query(
        `UPDATE students
         SET admission_number = $1,
             date_of_birth = $2,
             gender = $3,
             phone = $4,
             address = $5
         WHERE id = $6
         RETURNING *`,
        [
          admission_number.trim(),
          date_of_birth || null,
          gender || null,
          phone || null,
          address || null,
          id,
        ]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: "Student updated successfully.",
        student: {
          ...result.rows[0],
          full_name: full_name.trim(),
          email: email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Student update error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Email or admission number already exists.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update student.",
      });
    } finally {
      client.release();
    }
  }
);

// DELETE /api/students/:id
// Delete student and associated user account — Admin only
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;

   if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `SELECT s.id, s.user_id, s.admission_number
         FROM students s
         WHERE s.id = $1
         FOR UPDATE`,
        [id]
      );

      if (existing.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      const { user_id, admission_number } = existing.rows[0];

      await client.query(
        "DELETE FROM users WHERE id = $1",
        [user_id]
      );

      await client.query("COMMIT");

      res.status(200).json({
        success: true,
        message: "Student and associated account deleted successfully.",
        student: {
          id,
          admission_number,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");

      console.error("Student deletion error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to delete student.",
      });
    } finally {
      client.release();
    }
  }
);

export default router;
