
import jwt from "jsonwebtoken";
import pool from "../config/database.js";

// Verify JWT and confirm the account is still active
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Expect: Authorization: Bearer <token>
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token required.",
    });
  }

  // Ensure the JWT secret is configured
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      success: false,
      message: "Authentication service is not configured.",
    });
  }

  let decoded;

  // Step 1: Verify the token
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Check the expected token payload
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !Number.isSafeInteger(Number(decoded.id)) ||
      Number(decoded.id) <= 0 ||
      typeof decoded.exp !== "number"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  // Step 2: Check the current account in PostgreSQL
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_active
       FROM users
       WHERE id = $1`,
      [Number(decoded.id)]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: "Account not found or deactivated. Please log in again.",
      });
    }

    const user = result.rows[0];

    // Always use the current database role, not the old JWT role
    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    console.error("Authentication database error:", error);

    return res.status(503).json({
      success: false,
      message: "Authentication service temporarily unavailable.",
    });
  }
};

// Check whether the logged-in user has an allowed role
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission.",
      });
    }

    return next();
  };
};
