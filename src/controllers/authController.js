// src/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByPhoneOrEmail } from "../models/userModel.js";
import { addUserLocation } from "../models/locationModel.js";
import { analyzeCropSeason } from "../services/cropSeasonService.js";
import pool from "../config/db.js";

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password, locationName, latitude, longitude } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ msg: "Name, phone, and password are required" });
    }

    const existingUser = await findUserByPhoneOrEmail(phone);
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists with this phone/email" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 1️⃣ Create user
    const user = await createUser({ name, phone, email, passwordHash });

    // 2️⃣ Insert user location (if provided)
    let userLocation = null;
    if (locationName && latitude && longitude) {
      userLocation = await addUserLocation({
        userId: user.id,
        name: locationName,
        latitude,
        longitude,
        source: "signup",
      });

      // 3️⃣ Fetch all crops
      const crops = await pool`SELECT id FROM crops`;

      // 4️⃣ Run analyzer for recommendations
      for (const crop of crops) {
        try {
          const result = await analyzeCropSeason(crop.id, userLocation.id, { mode: "recommendation" });

          // Analyzer handles insert into recommendations if is_season = true
        } catch (err) {
          console.error(`Analyzer failed for crop ${crop.id}:`, err.message);
        }
      }
    }

    // 5️⃣ Create JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      msg: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        location: locationName || null,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup" });
  }
};



export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier = phone or email
    if (!identifier || !password) {
      return res.status(400).json({ msg: "Phone/email and password required" });
    }

    const user = await findUserByPhoneOrEmail(identifier);
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      msg: "Login successful",
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
};
