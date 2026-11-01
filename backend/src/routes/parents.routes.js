
import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../config/database.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = Router();

const isValidId = (value) =>
  /^[1-9]\d*$/.test(String(value)) &&
  Number.isSafeInteger(Number(value));

const validRelationships = [
  "parent",
  "father",
  "mother",
  "guardian",
  "other",
];

// ==========================================
// PARENT PORTAL: GET MY CHILDREN
// ==========================================

router.get(
  "/me/children",
  authenticateToken,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           s.id AS student_id,
           s.admission_number,
           s.date_of_birth,
           s.gender,
           s.phone,
           s.address,
           u.full_name,
           u.email,
           ps.relationship
         FROM parents p
         JOIN users pu ON pu.id = p.user_id
         JOIN parent_students ps ON ps.parent_id = p.id
         JOIN students s ON s.id = ps.student_id
         JOIN users u ON u.id = s.user_id
         WHERE p.user_id = $1
           AND pu.is_active = TRUE
           AND u.is_active = TRUE
         ORDER BY u.full_name`,
        [req.user.id]
      );

      return res.json({
        success: true,
        count: result.rows.length,
        children: result.rows,
      });
    } catch (error) {
      console.error("Get parent children error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve children.",
      });
    }
  }
);

// ==========================================
// PARENT PORTAL: GET ONE CHILD'S DETAILS
// ==========================================

router.get(
  "/me/children/:studentId",
  authenticateToken,
  authorizeRoles("parent"),
  async (req, res) => {
    try {
      const { studentId } = req.params;

      if (!isValidId(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      const childResult = await pool.query(
        `SELECT
           s.id AS student_id,
           s.admission_number,
           s.date_of_birth,
           s.gender,
           s.phone,
           s.address,
           u.full_name,
           u.email,
           ps.relationship
         FROM parent_students ps
         JOIN parents p ON p.id = ps.parent_id
         JOIN users pu ON pu.id = p.user_id
         JOIN students s ON s.id = ps.student_id
         JOIN users u ON u.id = s.user_id
         WHERE p.user_id = $1
           AND s.id = $2
           AND pu.is_active = TRUE
           AND u.is_active = TRUE`,
        [req.user.id, studentId]
      );

      if (childResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Child not found or not linked to your account.",
        });
      }

      const classesResult = await pool.query(
        `SELECT
           e.id AS enrollment_id,
           e.enrollment_date,
           e.status,
           c.id AS class_id,
           c.class_name,
           c.academic_year
         FROM enrollments e
         JOIN classes c ON c.id = e.class_id
         WHERE e.student_id = $1
           AND e.status = 'active'
           AND c.is_active = TRUE
         ORDER BY c.class_name`,
        [studentId]
      );

      const attendanceResult = await pool.query(
        `SELECT
           a.id,
           a.class_id,
           c.class_name,
           a.attendance_date,
           a.status
         FROM attendance a
         JOIN classes c ON c.id = a.class_id
         WHERE a.student_id = $1
           AND c.is_active = TRUE
         ORDER BY a.attendance_date DESC`,
        [studentId]
      );

      const gradesResult = await pool.query(
        `SELECT
           g.id,
           g.class_id,
           c.class_name,
           g.subject,
           g.assessment_type,
           g.score,
           g.maximum_score,
           CASE
             WHEN g.maximum_score > 0
             THEN ROUND(
               (g.score::numeric / g.maximum_score) * 100,
               2
             )
             ELSE 0
           END AS percentage,
           g.assessment_date
         FROM grades g
         JOIN classes c ON c.id = g.class_id
         WHERE g.student_id = $1
           AND c.is_active = TRUE
         ORDER BY g.assessment_date DESC`,
        [studentId]
      );

      return res.json({
        success: true,
        child: childResult.rows[0],
        classes: classesResult.rows,
        attendance: attendanceResult.rows,
        grades: gradesResult.rows,
      });
    } catch (error) {
      console.error("Get child details error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve child details.",
      });
    }
  }
);

// ==========================================
// GET ALL PARENTS (ADMIN)
// ==========================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           p.id,
           p.user_id,
           u.full_name,
           u.email,
           u.is_active,
           p.phone,
           p.address,
           p.occupation,
           COUNT(ps.student_id)::int AS children_count
         FROM parents p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN parent_students ps ON ps.parent_id = p.id
         GROUP BY p.id, u.id
         ORDER BY u.full_name`
      );

      return res.json({
        success: true,
        count: result.rows.length,
        parents: result.rows,
      });
    } catch (error) {
      console.error("Get parents error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve parents.",
      });
    }
  }
);

// ==========================================
// GET ONE PARENT (ADMIN)
// ==========================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent ID.",
        });
      }

      const result = await pool.query(
        `SELECT
           p.id,
           p.user_id,
           u.full_name,
           u.email,
           u.is_active,
           p.phone,
           p.address,
           p.occupation
         FROM parents p
         JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Parent not found.",
        });
      }

      return res.json({
        success: true,
        parent: result.rows[0],
      });
    } catch (error) {
      console.error("Get parent error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve parent.",
      });
    }
  }
);

// ==========================================
// GET CHILDREN OF A PARENT (ADMIN)
// ==========================================

router.get(
  "/:id/children",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent ID.",
        });
      }

      const result = await pool.query(
        `SELECT
           s.id AS student_id,
           s.admission_number,
           s.date_of_birth,
           s.gender,
           u.full_name,
           u.email,
           ps.relationship
         FROM parent_students ps
         JOIN students s ON s.id = ps.student_id
         JOIN users u ON u.id = s.user_id
         WHERE ps.parent_id = $1
         ORDER BY u.full_name`,
        [id]
      );

      return res.json({
        success: true,
        count: result.rows.length,
        children: result.rows,
      });
    } catch (error) {
      console.error("Get parent children error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve children.",
      });
    }
  }
);

// ==========================================
// LINK STUDENTS TO EXISTING PARENT (ADMIN)
// ==========================================

router.post(
  "/:id/children",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { student_ids, relationship } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent ID.",
      });
    }

    if (
      !Array.isArray(student_ids) ||
      student_ids.length === 0 ||
      student_ids.some((studentId) => !isValidId(studentId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Select at least one valid student.",
      });
    }

    const normalizedRelationship =
      typeof relationship === "string"
        ? relationship.toLowerCase()
        : "";

    if (!validRelationships.includes(normalizedRelationship)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid relationship.",
      });
    }

    const studentIds = student_ids.map(Number);

    if (new Set(studentIds).size !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: "A student cannot be selected more than once.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const parentResult = await client.query(
        `SELECT id FROM parents WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (parentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Parent not found.",
        });
      }

      const studentsResult = await client.query(
        `SELECT s.id
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = ANY($1::bigint[])
           AND u.is_active = TRUE`,
        [studentIds]
      );

      if (studentsResult.rows.length !== studentIds.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "One or more students do not exist or are inactive.",
        });
      }

      const existingResult = await client.query(
        `SELECT student_id
         FROM parent_students
         WHERE parent_id = $1
           AND student_id = ANY($2::bigint[])`,
        [id, studentIds]
      );

      if (existingResult.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "One or more students are already linked to this parent.",
        });
      }

      for (const studentId of studentIds) {
        await client.query(
          `INSERT INTO parent_students
             (parent_id, student_id, relationship)
           VALUES ($1, $2, $3)`,
          [id, studentId, normalizedRelationship]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Students linked successfully.",
        children_linked: studentIds.length,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Link students error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to link students.",
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================
// CREATE PARENT AND LINK CHILDREN (ADMIN)
// ==========================================

router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const {
      full_name,
      email,
      password,
      phone,
      address,
      occupation,
      children,
    } = req.body;

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      full_name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid parent name.",
      });
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 bytes.",
      });
    }

    if (children !== undefined && !Array.isArray(children)) {
      return res.status(400).json({
        success: false,
        message: "Children must be an array.",
      });
    }

    const childList = children || [];

    if (
      childList.some(
        (child) =>
          !child ||
          !isValidId(child.student_id) ||
          !validRelationships.includes(
            String(child.relationship).toLowerCase()
          )
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each child needs a valid student ID and relationship.",
      });
    }

    const childIds = childList.map((child) => Number(child.student_id));

    if (new Set(childIds).size !== childIds.length) {
      return res.status(400).json({
        success: false,
        message: "A student cannot be linked more than once.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const passwordHash = await bcrypt.hash(password, 12);

      const userResult = await client.query(
        `INSERT INTO users
           (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'parent')
         RETURNING id, full_name, email, role`,
        [full_name.trim(), normalizedEmail, passwordHash]
      );

      const user = userResult.rows[0];

      const parentResult = await client.query(
        `INSERT INTO parents
           (user_id, phone, address, occupation)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          user.id,
          phone?.trim() || null,
          address?.trim() || null,
          occupation?.trim() || null,
        ]
      );

      const parent = parentResult.rows[0];

      for (const child of childList) {
        const linkResult = await client.query(
          `INSERT INTO parent_students
             (parent_id, student_id, relationship)
           SELECT $1, s.id, $3
           FROM students s
           JOIN users u ON u.id = s.user_id
           WHERE s.id = $2
             AND u.is_active = TRUE
           RETURNING id`,
          [
            parent.id,
            Number(child.student_id),
            String(child.relationship).toLowerCase(),
          ]
        );

        if (linkResult.rows.length === 0) {
          throw new Error(
            `Student ID ${child.student_id} does not exist or is inactive.`
          );
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Parent account created successfully.",
        parent: {
          ...parent,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
        children_linked: childList.length,
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This email address is already registered.",
        });
      }

      if (error.message.startsWith("Student ID")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      console.error("Create parent error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create parent account.",
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================
// UPDATE PARENT (ADMIN)
// ==========================================

router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, address, occupation } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid parent ID.",
      });
    }

    if (
      typeof full_name !== "string" ||
      !full_name.trim() ||
      full_name.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid parent name.",
      });
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const parentResult = await client.query(
        `SELECT user_id FROM parents
         WHERE id = $1
         FOR UPDATE`,
        [id]
      );

      if (parentResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          success: false,
          message: "Parent not found.",
        });
      }

      const userId = parentResult.rows[0].user_id;

      await client.query(
        `UPDATE users
         SET full_name = $1,
             email = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [full_name.trim(), normalizedEmail, userId]
      );

      await client.query(
        `UPDATE parents
         SET phone = $1,
             address = $2,
             occupation = $3
         WHERE id = $4`,
        [
          phone?.trim() || null,
          address?.trim() || null,
          occupation?.trim() || null,
          id,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Parent updated successfully.",
      });
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This email address is already registered.",
        });
      }

      console.error("Update parent error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update parent.",
      });
    } finally {
      client.release();
    }
  }
);

// ==========================================
// DELETE PARENT (ADMIN)
// ==========================================

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
          message: "Invalid parent ID.",
        });
      }

      const result = await pool.query(
        `DELETE FROM users u
         USING parents p
         WHERE p.id = $1
           AND p.user_id = u.id
         RETURNING u.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Parent not found.",
        });
      }

      return res.json({
        success: true,
        message: "Parent deleted successfully.",
      });
    } catch (error) {
      console.error("Delete parent error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete parent.",
      });
    }
  }
);

export default router;
