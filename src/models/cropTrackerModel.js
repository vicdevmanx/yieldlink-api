import pool from "../config/db.js";

// Add crop to a user's tracker
export const addCrop = async (userId, cropId) => {
  const result = await pool`
    INSERT INTO crop_tracker (user_id, crop_id)
    VALUES (${userId}, ${cropId})
    RETURNING *;
  `;
  return result[0]; // return inserted row
};

// Get all crops a user is tracking
export const getCropsByUser = async (userId) => {
  const result = await pool`
    SELECT ct.id, c.common_name
    FROM crop_tracker ct
    JOIN crops c ON ct.crop_id = c.id
    WHERE ct.user_id = ${userId};
  `;
  return result;
};

// Remove a crop from a user's tracker
export const removeCrop = async (userId, cropId) => {
  const result = await pool`
    DELETE FROM crop_tracker
    WHERE user_id = ${userId} AND crop_id = ${cropId}
    RETURNING *;
  `;
  return result[0]; // return deleted row
};
