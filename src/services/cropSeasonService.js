// src/services/cropSeasonService.js
import fetch from "node-fetch";
import pool from "../config/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// ✅ OpenWeather settings
const OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/onecall";
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY;

// Fetch weather for a given location
export const getWeather = async (lat, lon) => {
  const res = await fetch(
    `${OPENWEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch weather");
  return await res.json();
};

// Analyze crop season confidence
export const analyzeCropSeason = async (cropId, stateId) => {
  // 1️⃣ Fetch crop details
  const [crop] = await pool`SELECT * FROM crops WHERE id = ${cropId}`;
  if (!crop) throw new Error("Crop not found");

  // 2️⃣ Fetch location
  const [state] = await pool`SELECT * FROM states WHERE id = ${stateId}`;
  if (!state) throw new Error("State not found");

  // 3️⃣ Get weather
  const weather = await getWeather(state.latitude, state.longitude);
  const currentTemp = weather.current.temp;
  const next7Rainfall = weather.daily
    .slice(0, 7)
    .reduce((sum, d) => sum + (d.rain || 0), 0);

  // 4️⃣ Compute confidence
  let score = 0;
  if (currentTemp >= crop.temp_min_c && currentTemp <= crop.temp_max_c) score += 50;
  if (next7Rainfall >= crop.rainfall_min_mm / 52 && next7Rainfall <= crop.rainfall_max_mm / 52) score += 50;

  // 5️⃣ AI Explanation
  const prompt = `
  Crop: ${crop.common_name}
  Season Window: ${crop.season_months}
  Requirements: Temp ${crop.temp_min_c}–${crop.temp_max_c}°C, Rainfall ${crop.rainfall_min_mm}–${crop.rainfall_max_mm} mm/year
  Current: Temp ${currentTemp}°C, Rainfall (7d forecast) ${next7Rainfall} mm

  Based on this, explain if it's a good time to plant, with practical advice.
  `;
  const aiResponse = await model.generateContent(prompt);

  return {
    crop: crop.common_name,
    location: state.name,
    confidence: score,
    advice: aiResponse.response.text(),
  };
};
