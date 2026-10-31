
import bcrypt from "bcrypt";
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

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
};

const validateOptionalFields = (phone, qualification, hire_date) => {
  if (
    phone !== undefined &&
    phone !== null &&
    (typeof phone !== "string" || phone.trim().length > 30)
  ) {
    return "Phone must be a string of no more than 30 characters.";
  }

  if (
    qualification !== undefined &&
    qualification !== null &&
    (typeof qualification !== "string" ||
      qualification.trim().length > 150)
  ) {
    return "Qualification must be a string of no more than 150 characters.";
  }

  if (
    hire_date !== undefined &&
    hire_date !== null &&
    hire_date !== "" &&
    !isValidDate(hire_date)
  ) {
    return "Hire date must be a valid date in YYYY-MM-DD format.";
  }

  return null;
};

// --------------------------------------------------
// GET /api/teachers
// Admin: retrieve all teachers.
// Teacher: retrieve only their own profile.
// --------------------------------------------------

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const values = [];
      let whereClause = "";

      if (req.user.role === "teacher") {
        values.push(req.user.id);
        whereClause = "WHERE u.id = $1";
      }

      if (search) {
        values.push(`%${search}%`);

        const searchIndex = values.length;

        whereClause += whereClause
          ? ` AND (
              u.full_name ILIKE $${searchIndex}
              OR u.email ILIKE $${searchIndex}
              OR t.employee_number ILIKE $${searchIndex}
            )`
          : `WHERE (
              u.full_name ILIKE $${searchIndex}
              OR u.email ILIKE $${searchIndex}
              OR t.employee_number ILIKE $${searchIndex}
            )`;
      }

      const result = await pool.query(
        `
        SELECT
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
        ${whereClause}
        ORDER BY t.id ASC
        `,
        values
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

// --------------------------------------------------
// GET /api/teachers/:id
// Admin: retrieve any teacher.
// Teacher: retrieve only their own profile.
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
        message: "Invalid teacher ID.",
      });
    }

    try {
      const values = [id];

      let accessCondition = "";

      if (req.user.role === "teacher") {
        values.push(req.user.id);
        accessCondition = "AND u.id = $2";
      }

      const result = await pool.query(
        `
        SELECT
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
        WHERE t.id = $1
        ${accessCondition}
        `,
        values
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

// --------------------------------------------------
// POST /api/teachers
// Register a teacher — Admin only
// --------------------------------------------------

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
        message:
          "Name, email, password and employee number are required.",
      });
    }

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanEmployeeNumber = employee_number.trim();

    if (cleanName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must not exceed 150 characters.",
      });
    }

    if (cleanEmail.length > 254 || !isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and no more than 72 bytes.",
      });
    }

    if (cleanEmployeeNumber.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Employee number must not exceed 50 characters.",
      });
    }

    const optionalError = validateOptionalFields(
      phone,
      qualification,
      hire_date
    );

    if (optionalError) {
      return res.status(400).json({
        success: false,
        message: optionalError,
      });
    }

    let client;
    let transactionStarted = false;

    try {
      client = await pool.connect();

      await client.query("BEGIN");
      transactionStarted = true;

      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `
        INSERT INTO users
          (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, 'teacher')
        RETURNING id
        `,
        [cleanName, cleanEmail, passwordHash]
      );

      const userId = userResult.rows[0].id;

      const teacherResult = await client.query(
        `
        INSERT INTO teachers
          (user_id, employee_number, phone, qualification, hire_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
          userId,
          cleanEmployeeNumber,
          phone?.trim() || null,
          qualification?.trim() || null,
          hire_date || null,
        ]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      res.status(201).json({
        success: true,
        message: "Teacher registered successfully.",
        teacher: {
          ...teacherResult.rows[0],
          full_name: cleanName,
          email: cleanEmail,
        },
      });
    } catch (error) {
      if (client && transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Teacher registration rollback error:", rollbackError.message);
        }
      }

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
      if (client) {
        client.release();
      }
    }
  }
);

// --------------------------------------------------
// PUT /api/teachers/:id
// Update teacher information — Admin only
// --------------------------------------------------

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

    if (!isValidId(id)) {
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

    const cleanName = full_name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanEmployeeNumber = employee_number.trim();

    if (cleanName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Full name must not exceed 150 characters.",
      });
    }

    if (cleanEmail.length > 254 || !isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    if (cleanEmployeeNumber.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Employee number must not exceed 50 characters.",
      });
    }

    const optionalError = validateOptionalFields(
      phone,
      qualification,
      hire_date
    );

    if (optionalError) {
      return res.status(400).json({
        success: false,
        message: optionalError,
      });
    }

    let client;
    let transactionStarted = false;

    try {
      client = await pool.connect();

      await client.query("BEGIN");
      transactionStarted = true;

      const userResult = await client.query(
        `
        UPDATE users u
        SET
          full_name = $1,
          email = $2,
          updated_at = CURRENT_TIMESTAMP
        FROM teachers t
        WHERE t.user_id = u.id
          AND t.id = $3
        RETURNING u.id
        `,
        [cleanName, cleanEmail, id]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return res.status(404).json({
          success: false,
          message: "Teacher not found.",
        });
      }

      await client.query(
        `
        UPDATE teachers
        SET
          employee_number = $1,
          phone = $2,
          qualification = $3,
          hire_date = $4
        WHERE id = $5
        `,
        [
          cleanEmployeeNumber,
          phone?.trim() || null,
          qualification?.trim() || null,
          hire_date || null,
          id,
        ]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      res.status(200).json({
        success: true,
        message: "Teacher updated successfully.",
      });
    } catch (error) {
      if (client && transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("Teacher update rollback error:", rollbackError.message);
        }
      }

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
    } finally {
      if (client) {
        client.release();
      }
    }
  }
);

// --------------------------------------------------
// PATCH /api/teachers/:id/deactivate
// Deactivate a teacher account — Admin only
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
        message: "Invalid teacher ID.",
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE users u
        SET
          is_active = FALSE,
          updated_at = CURRENT_TIMESTAMP
        FROM teachers t
        WHERE t.user_id = u.id
          AND t.id = $1
          AND u.is_active = TRUE
        RETURNING u.id
        `,
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

// --------------------------------------------------
// PATCH /api/teachers/:id/reactivate
// Reactivate a teacher account — Admin only
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
        message: "Invalid teacher ID.",
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE users u
        SET
          is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
        FROM teachers t
        WHERE t.user_id = u.id
          AND t.id = $1
          AND u.is_active = FALSE
        RETURNING
          t.id,
          t.employee_number,
          u.full_name,
          u.email,
          u.is_active
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Inactive teacher not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Teacher reactivated successfully.",
        teacher: result.rows[0],
      });
    } catch (error) {
      console.error("Teacher reactivation error:", error.message);

      res.status(500).json({
        success: false,
        message: "Failed to reactivate teacher.",
      });
    }
  }
);

export default router;
