import express from "express";
import { getAllCrops } from "../controllers/cropController.js";

const router = express.Router();

// Get all available crops
router.get("/", getAllCrops);

export default router;
