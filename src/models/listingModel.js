import pool from "../config/db.js";

// Create listing
export const createListing = async ({ userId, cropName, location, quantity, contact }) => {
  const result = await pool`
    INSERT INTO listings (user_id, crop_name, location, quantity, contact)
    VALUES (${userId}, ${cropName}, ${location}, ${quantity}, ${contact})
    RETURNING *;
  `;
  return result[0];
};

// Get all listings (public view, with filters)
export const getAllListings = async ({ cropName, location }) => {
  let query = pool`SELECT * FROM listings WHERE 1=1`;
  if (cropName) query = pool`${query} AND crop_name ILIKE ${'%' + cropName + '%'}`;
  if (location) query = pool`${query} AND location ILIKE ${'%' + location + '%'}`;
  return await query;
};

// Get listings for a user
export const getUserListings = async (userId) => {
  const result = await pool`
    SELECT * FROM listings
    WHERE user_id = ${userId};
  `;
  return result;
};

// Update listing
export const updateListing = async ({ listingId, userId, cropName, location, quantity, contact }) => {
  const result = await pool`
    UPDATE listings
    SET crop_name = ${cropName},
        location = ${location},
        quantity = ${quantity},
        contact = ${contact},
        updated_at = NOW()
    WHERE id = ${listingId} AND user_id = ${userId}
    RETURNING *;
  `;
  return result[0];
};

// Delete listing
export const deleteListing = async (listingId, userId) => {
  const result = await pool`
    DELETE FROM listings
    WHERE id = ${listingId} AND user_id = ${userId}
    RETURNING *;
  `;
  return result[0];
};
