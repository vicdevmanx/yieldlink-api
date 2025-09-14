import { fetchAllCrops } from "../models/cropModel.js";

export const getAllCrops = async (req, res) => {
  try {
    const crops = await fetchAllCrops();
    res.json(crops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
