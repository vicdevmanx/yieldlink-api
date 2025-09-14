import { createListing, getAllListings, getUserListings, updateListing, deleteListing } from "../models/listingModel.js";

// Create new listing
export const addListing = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { cropName, location, quantity, contact } = req.body;
    const listing = await createListing({ userId, cropName, location, quantity, contact });
    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ error: "Failed to create listing" });
    console.log(error.stack)
  }
};

// Get all listings (public)
export const fetchAllListings = async (req, res) => {
  try {
    const { cropName, location } = req.query;
    const listings = await getAllListings({ cropName, location });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
};

// Get listings for logged-in user
export const fetchUserListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const listings = await getUserListings(userId);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user listings" });
  }
};

// Update listing
export const editListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;
    const { cropName, location, quantity, contact } = req.body;
    const listing = await updateListing({ listingId, userId, cropName, location, quantity, contact });
    if (!listing) return res.status(404).json({ error: "Listing not found or not yours" });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: "Failed to update listing" });
  }
};

// Delete listing
export const removeListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId } = req.params;
    const listing = await deleteListing(listingId, userId);
    if (!listing) return res.status(404).json({ error: "Listing not found or not yours" });
    res.json({ message: "Listing deleted", listing });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
};
