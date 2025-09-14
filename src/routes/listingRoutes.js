import express from "express";
import { addListing, fetchAllListings, fetchUserListings, editListing, removeListing } from "../controllers/listingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", fetchAllListings);

// Authenticated user routes
router.post("/", protect, addListing);
router.get("/my", protect, fetchUserListings);
router.put("/:listingId", protect, editListing);
router.delete("/:listingId", protect, removeListing);

export default router;
