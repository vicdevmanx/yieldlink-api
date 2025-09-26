// routes/locationRoutes.js
import express from "express";
import { suggestLocations } from "../controllers/locationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { createLocation, listLocations, removeLocation } from "../controllers/locationController.js";

const router = express.Router();

router.get("/suggest", suggestLocations);
router.post("/", protect, createLocation);  // add location
router.get("/", protect, listLocations);    // list locations
router.delete("/:id", protect, removeLocation); // delete location


export default router;
