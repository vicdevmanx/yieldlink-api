// src/controllers/cropController.js
import pool from "../config/db.js";

// Fetch all crops
export const fetchAllCrops = async () => {
  return await pool`
    SELECT 
      id,
      common_name,
      season_months,
      temp_min_c,
      temp_max_c,
      rainfall_min_mm,
      rainfall_max_mm,
      region_suitability,
      drought_sensitivity,
      flood_sensitivity,
      notes
    FROM crops
    ORDER BY common_name ASC
  `;
};
