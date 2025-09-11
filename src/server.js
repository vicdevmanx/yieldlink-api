// src/server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Import routes
import authRoutes from "./routes/authRoutes.js";
// Later we’ll add: import cropRoutes from "./routes/cropRoutes.js";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const upload = multer();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());  // <-- VERY IMPORTANT
app.use(upload.none());  // This parses multipart/form-data (no files, just text fields)
app.use(express.urlencoded({ extended: true })); // <-- Handles form data
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// Routes
app.use("/api/auth", authRoutes);
// app.use("/api/crops", cropRoutes);   <-- will add later
// app.use("/api/users", userRoutes);   <-- will add later

// Health check
app.get("/", (req, res) => {
  res.send("🌱 YieldLink API running...");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
