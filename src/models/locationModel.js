import pool from "../config/db.js";

// Add a user location
export const addUserLocation = async ({ userId, name, latitude, longitude, source }) => {
  const [row] = await pool`
    INSERT INTO user_locations (user_id, name, latitude, longitude, source)
    VALUES (${userId}, ${name}, ${latitude}, ${longitude}, ${source || "typed"})
    RETURNING *;
  `;
  return row;
};

// Get all locations for a user
export const getUserLocations = async (userId) => {
  return await pool`SELECT * FROM user_locations WHERE user_id = ${userId} ORDER BY created_at DESC`;
};

// Delete a location
export const deleteUserLocation = async (id, userId) => {
  await pool`DELETE FROM user_locations WHERE id = ${id} AND user_id = ${userId}`;
  return { success: true };
};
