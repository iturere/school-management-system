
import { Router } from "express";
import { login } from "../controllers/auth.controller.js";
import {
  authenticateToken,
} from "../middleware/auth.middleware.js";

const router = Router();

// Public route: log in
router.post("/login", login);

// Protected route: get the logged-in user's details
router.get("/me", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "You are authenticated.",
    user: req.user,
  });
});

export default router;
