import bcrypt from "bcrypt";
import { Router } from "express";
import pool from "../config/database.js";

const router = Router();

// GET /api/students
// Retrieve all students
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
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
      ORDER BY s.id ASC
    `);

    res.status(200).json({
      success: true,
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
});



// GET /api/students/:id
// Retrieve one student by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

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
});





///////////////////////






// PUT /api/students/:id
// Update student information
router.put("/:id", async (req, res) => {
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

    // Find the student and lock the records for this transaction
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

    // Update login account information
    await client.query(
      `UPDATE users
       SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [full_name.trim(), email.trim().toLowerCase(), userId]
    );

    // Update student profile
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
});


/////////////////////



// DELETE /api/students/:id
// Delete a student
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid student ID.",
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM students
       WHERE id = $1
       RETURNING id, admission_number`,
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
      message: "Student deleted successfully.",
      student: result.rows[0],
    });
  } catch (error) {
    console.error("Student deletion error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to delete student.",
    });
  }
});


// POST /api/students
// Register a new student
router.post("/", async (req, res) => {
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

  // Validate required fields
  if (!full_name || !email || !password || !admission_number) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, password and admission number are required.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user account
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id`,
      [full_name.trim(), email.trim().toLowerCase(), passwordHash]
    );

    const userId = userResult.rows[0].id;

    // Create student profile
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
});



export default router;
