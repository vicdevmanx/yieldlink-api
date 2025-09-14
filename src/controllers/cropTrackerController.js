import { addCrop, getCropsByUser, removeCrop } from "../models/cropTrackerModel.js";

// integrate and generate season with actual logic & aso confidence percentage

// Add crop
export const addCropToTracker = async (req, res) => {
  try {
    const { userId, cropId } = req.body;
    const crop = await addCrop(userId, cropId);
    res.status(201).json({ message: "Crop added to tracker", crop });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get user’s crops
export const getUserCrops = async (req, res) => {
  try {
    const { userId } = req.params;
    const crops = await getCropsByUser(userId);
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete crop
export const deleteCropFromTracker = async (req, res) => {
  try {
    const { userId, cropId } = req.params;
    await removeCrop(userId, cropId);
    res.json({ message: "Crop removed from tracker" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
