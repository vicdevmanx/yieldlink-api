import express from "express";
import {
  addCropToTracker,
  getUserCrops,
  deleteCropFromTracker,
} from "../controllers/cropTrackerController.js";

const router = express.Router();

// Add crop to user’s tracker
router.post("/add", addCropToTracker);

// Get all crops a user is tracking
router.get("/:userId", getUserCrops);

// Delete crop from tracker
router.delete("/:userId/:cropId", deleteCropFromTracker);

export default router;
