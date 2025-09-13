import express from "express";
import { signup, login } from "../controllers/authController.js";
import { getProfile, updateProfile, deleteProfile } from "../controllers/profileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Auth
router.post("/signup", signup);
router.post("/login", login);

// Profile routes (protected, no params — use token)
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);

export default router;
