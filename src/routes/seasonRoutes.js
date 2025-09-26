// src/routes/seasonRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  checkSeason,
  listSeasonTrackers,
  editSeasonTracker,
  removeSeasonTracker
} from "../controllers/seasonController.js";

const router = express.Router();

// Analyze crop season (AI + weather)
router.post("/check", protect, checkSeason);

// Get all trackers for a user location
router.get("/:userLocationId", protect, listSeasonTrackers);

// Update manually
router.put("/:id", protect, editSeasonTracker);

// Delete
router.delete("/:id", protect, removeSeasonTracker);

export default router;
