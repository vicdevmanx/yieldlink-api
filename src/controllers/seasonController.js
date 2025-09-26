// src/controllers/seasonController.js
import { analyzeCropSeason } from "../services/cropSeasonService.js";
import {
  createSeasonTracker,
  getSeasonTrackersByLocation,
  updateSeasonTracker,
  deleteSeasonTracker
} from "../models/seasonTrackerModel.js";

// Run analyzer and save to DB
export const checkSeason = async (req, res) => {
  try {
    const { cropId, userLocationId } = req.body;
    if (!cropId || !userLocationId) {
      return res.status(400).json({ msg: "cropId and userLocationId are required" });
    }

    const result = await analyzeCropSeason(cropId, userLocationId);

    // already saved inside analyzer, but return result
    return res.status(200).json({
      msg: "Season analysis completed",
      result
    });
  } catch (err) {
    console.error("checkSeason error:", err.message);
    res.status(500).json({ error: "Failed to analyze season" });
  }
};

// List all season tracker entries for a location
export const listSeasonTrackers = async (req, res) => {
  try {
    const { userLocationId } = req.params;
    const trackers = await getSeasonTrackersByLocation(userLocationId);
    res.status(200).json(trackers);
  } catch (err) {
    console.error("listSeasonTrackers error:", err.message);
    res.status(500).json({ error: "Failed to fetch season trackers" });
  }
};

// Update season tracker (manually if needed)
export const editSeasonTracker = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSeason, confidence, tips } = req.body;
    const updated = await updateSeasonTracker(id, { isSeason, confidence, tips });
    res.status(200).json(updated);
  } catch (err) {
    console.error("editSeasonTracker error:", err.message);
    res.status(500).json({ error: "Failed to update season tracker" });
  }
};

// Delete
export const removeSeasonTracker = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteSeasonTracker(id);
    res.status(200).json({ msg: "Season tracker deleted" });
  } catch (err) {
    console.error("removeSeasonTracker error:", err.message);
    res.status(500).json({ error: "Failed to delete season tracker" });
  }
};
