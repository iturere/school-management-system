
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Check required database settings
const requiredVariables = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing database environment variables: ${missingVariables.join(", ")}`
  );
}

const port = Number(process.env.DB_PORT || 5432);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT must be a valid port number.");
}

// Create one reusable PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle unexpected errors from idle database connections
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool;
