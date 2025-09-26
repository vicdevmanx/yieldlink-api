// src/models/seasonTrackerModel.js
import pool from "../config/db.js";

// Create a season tracker entry (used internally by analyzer too)
export const createSeasonTracker = async ({ cropId, userLocationId, isSeason, confidence, tips }) => {
  const [row] = await pool`
    INSERT INTO season_tracker (crop_id, user_location_id, is_season, confidence, tips, created_at)
    VALUES (${cropId}, ${userLocationId}, ${isSeason}, ${confidence}, ${tips}, NOW())
    RETURNING *;
  `;
  return row;
};

// Read all season tracker entries for a user (by their location)
export const getSeasonTrackersByLocation = async (userLocationId) => {
  return await pool`
    SELECT st.*, c.common_name AS crop_name, ul.name AS location_name
    FROM season_tracker st
    JOIN crops c ON c.id = st.crop_id
    JOIN user_locations ul ON ul.id = st.user_location_id
    WHERE st.user_location_id = ${userLocationId}
    ORDER BY st.created_at DESC;
  `;
};

// Update season tracker entry
export const updateSeasonTracker = async (id, { isSeason, confidence, tips }) => {
  const [row] = await pool`
    UPDATE season_tracker
    SET is_season = ${isSeason}, confidence = ${confidence}, tips = ${tips}, created_at = NOW()
    WHERE id = ${id}
    RETURNING *;
  `;
  return row;
};

// Delete season tracker entry
export const deleteSeasonTracker = async (id) => {
  await pool`DELETE FROM season_tracker WHERE id = ${id}`;
  return { success: true };
};
