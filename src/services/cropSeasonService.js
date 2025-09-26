// src/services/cropSeasonService.js
import fetch from "node-fetch";
import pool from "../config/db.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const OPENWEATHER_URL = "https://api.openweathermap.org/data/1.5/onecall";
const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";


// Initialize Gemini (if key available)
let genModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// -------- Helper utils --------
const monthNameToNumber = (m) => {
  const map = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  return map[m.slice(0, 3).toLowerCase()] || null;
};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Parse season_months string into array of month numbers (1..12) */
export const parseSeasonMonths = (s) => {
  if (!s || typeof s !== "string") return [];
  s = s.trim();

  if (/year\s*round/i.test(s)) return Array.from({ length: 12 }, (_, i) => i + 1);

  // Split on '&' or ',' or 'and'
  const parts = s.split(/\s*(?:&|,|and)\s*/i);
  const months = new Set();

  parts.forEach(p => {
    p = p.trim();
    // Examples: "April-June", "Nov-Jan", "March-April to October-December" (handle 'to Year Round' earlier)
    // If contains 'to' (range), treat as range of months
    if (/to/i.test(p) && /[A-Za-z]/.test(p)) {
      // e.g. "April-June to Year Round" or "April-June"
      // Break on 'to' then take left-most month range
      const left = p.split(/\bto\b/i)[0].trim();
      // left may be "April-June" or "April"
      if (/-/.test(left)) {
        const [a, b] = left.split('-').map(x => x.trim());
        const ai = monthNameToNumber(a);
        const bi = monthNameToNumber(b);
        if (ai && bi) {
          // handle wraparound
          let cur = ai;
          months.add(ai);
          while (cur !== bi) {
            cur = cur === 12 ? 1 : cur + 1;
            months.add(cur);
          }
        }
      } else {
        const single = monthNameToNumber(left);
        if (single) months.add(single);
      }
    } else if (/-/.test(p)) {
      const [a, b] = p.split('-').map(x => x.trim());
      const ai = monthNameToNumber(a);
      const bi = monthNameToNumber(b);
      if (ai && bi) {
        let cur = ai;
        months.add(ai);
        while (cur !== bi) {
          cur = cur === 12 ? 1 : cur + 1;
          months.add(cur);
        }
      }
    } else {
      // single month like "March" or "Jan"
      const single = monthNameToNumber(p);
      if (single) months.add(single);
    }
  });

  return Array.from(months).sort((a, b) => a - b);
}

/** Score value inside [min,max] producing 0..maxScore */
const scoreWithinRange = (value, min, max, maxScore = 100) => {
  if (min == null || max == null || isNaN(value)) return 0;
  // If value inside range => high score, closeness to center => higher
  if (value >= min && value <= max) {
    const mid = (min + max) / 2;
    const rangeHalf = (max - min) / 2 || 1;
    const diff = Math.abs(value - mid);
    const normalized = 1 - (diff / rangeHalf); // 1 at center, 0 at edges
    return Math.round(normalized * maxScore);
  }
  // If outside range, give scaled penalty based on distance
  const dist = value < min ? (min - value) : (value - max);
  // exponential decay
  const decayed = Math.max(0, maxScore - (dist / (Math.max(1, (max - min) || 10))) * maxScore * 1.5);
  return Math.round(Math.max(0, Math.min(maxScore, decayed)));
};

// -------- Weather fetch (7 day equivalent from 5-day/3-hour data) --------
export const get7DayWeather = async (lat, lon) => {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenWeather fetch failed: ${res.status} ${text}`);
  }
  const json = await res.json();

  // Group by day (UTC date)
  const dailyMap = {};
  for (const entry of json.list) {
    const date = new Date(entry.dt * 1000);
    const dayKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = {
        temps: [],
        rain: 0,
        pop: [],
      };
    }
    dailyMap[dayKey].temps.push(entry.main.temp);
    dailyMap[dayKey].pop.push(entry.pop ?? 0);
    if (entry.rain && entry.rain["3h"]) {
      dailyMap[dayKey].rain += entry.rain["3h"];
    }
  }

  // Convert into array similar to daily[]
  const daily = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    temp: {
      day: d.temps.reduce((a, b) => a + b, 0) / d.temps.length,
    },
    rain: d.rain,
    pop: d.pop.reduce((a, b) => a + b, 0) / d.pop.length,
  }));

  return { daily };
};


// -------- Main analyzer (7-day) --------
export const analyzeCropSeason = async (cropId, userLocationId, opts = {}) => {
  // opts can have: minConfidenceToSave (default 50)
  const minConfidenceToSave = opts.minConfidenceToSave ?? 50;
  // 1. fetch crop
  const [crop] = await pool`SELECT * FROM crops WHERE id = ${cropId}`;
  if (!crop) throw new Error("Crop not found");

  // 2. fetch user location
  const [location] = await pool`SELECT * FROM user_locations WHERE id = ${userLocationId}`;
  if (!location) throw new Error("User location not found");

  // 3. get weather (7-day)
  let weather;
  try {
    weather = await get7DayWeather(location.latitude, location.longitude);
  } catch (err) {
    console.error("Weather fetch failed:", err.message);
    throw new Error("Weather service error");
  }

  const daily = weather.daily?.slice(0, 7) || []; // ensure 7 or fewer
  if (daily.length === 0) throw new Error("No daily forecast available");

  // 4. compute metrics
  const avgTemp = daily.reduce((s, d) => s + (d.temp?.day ?? d.temp), 0) / daily.length;
  const totalRain = daily.reduce((s, d) => s + (d.rain ?? 0), 0);
  const maxDailyRain = Math.max(...daily.map(d => d.rain ?? 0));
  const daysWithRain = daily.filter(d => (d.rain ?? 0) > 0.5).length; // >0.5mm considered rainy day
  const popAvg = daily.reduce((s, d) => s + (d.pop ?? 0), 0) / daily.length; // probability of precipitation average

  // season-months
  const months = parseSeasonMonths(String(crop.season_months || ""));
  const preferredMonths = months.length ? months.map(m => monthNames[m - 1]).join(", ") : "Year round";

  // distribution penalties/flags
  let floodRisk = false;
  let droughtRisk = false;
  const expectedWeeklyMin = Number(crop.rainfall_min_mm) / 52;
  const expectedWeeklyMax = Number(crop.rainfall_max_mm) / 52;
  if (maxDailyRain >= 50 || (maxDailyRain >= 20 && daysWithRain >= 2)) floodRisk = true; // rough flood signal
  if (daysWithRain === 0 && totalRain < Math.max(1, expectedWeeklyMin * 0.5)) droughtRisk = true;

  // Current date/time (UTC or adjust for location timezone later if needed)
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const day = now.getDate();
  const year = now.getFullYear();

  const simplePrompt = `
You are a careful agricultural extension officer advising smallholder farmers & cooperatives in Africa.
Be humble, accurate, do your research, and never overpromise.

Location: ${location.name} (Lat: ${location.latitude}, Lon: ${location.longitude})
Date: ${day} ${monthName} ${year}

Crop: ${crop.common_name}
Avg forecasted temp (next 7 days): ${avgTemp.toFixed(1)} °C
Total forecasted rain (next 7 days): ${totalRain.toFixed(1)} mm
Days with meaningful rain: ${daysWithRain} / 7
Avg probability of precipitation: ${ (popAvg * 100).toFixed(0) }%
Flood risk: ${floodRisk ? "Yes" : "Low"}
Drought risk: ${droughtRisk ? "Yes" : "Low"}

Crop requirements:
- Temperature: ${crop.temp_min_c} – ${crop.temp_max_c} °C
- Annual rainfall: ${crop.rainfall_min_mm} – ${crop.rainfall_max_mm} mm
- Preferred planting months: ${preferredMonths}

Respond only with a JSON object with these exact keys:
- "confidence": integer from 0 to 100
- "is_good_time": "Yes" or "No"
- "explanation": string (if "No", explain whether the good planting window has already passed or is coming soon, using months as guidance; if "Yes", leave empty string)
- "tip": string (one practical tip that fits the farmer’s situation, e.g., soil type, watering, seed depth, spacing, or timing)
- "caution": string (one caution, e.g., flood, drought, pest, or poor soil condition)

Keep the language short, clear, and friendly in the tip and caution. Assume the farmer has no technical training. Use African smallholder context in your advice.
Do not add any other text outside the JSON.
`;

  let adviceText = "";
  let confidence = 0;
  let isSeason = false;

  try {
    if (genModel) {
      const aiResp = await genModel.generateContent(simplePrompt);
      // adapt to how SDK returns text; guard in case of change
      if (aiResp?.response?.text) adviceText = aiResp.response.text();
      else if (typeof aiResp === "string") adviceText = aiResp;
      else adviceText = JSON.stringify(aiResp).slice(0, 2000);

      const parsed = JSON.parse(adviceText);
      confidence = Number(parsed.confidence) || 0;
      isSeason = parsed.is_good_time === "Yes";
    } else {
      throw new Error("No AI model available");
    }
  } catch (err) {
    console.error("AI generation or parsing failed:", err.message);
    // Fallback to manual calculation
    const tempScore = Math.round(scoreWithinRange(avgTemp, Number(crop.temp_min_c), Number(crop.temp_max_c), 50));
    const rainScore = Math.round(scoreWithinRange(totalRain, expectedWeeklyMin, expectedWeeklyMax, 40));
    const seasonBonus = months.length === 0 ? 0 : (months.includes(now.getMonth() + 1) ? 10 : 0);
    confidence = Math.min(100, tempScore + rainScore + seasonBonus);

    // adjust confidence down for high popAvg uncertainty or extreme conditions
    if (popAvg < 0.15 && totalRain < expectedWeeklyMin * 0.5) {
      // mostly dry expected
      confidence = Math.round(confidence * 0.75);
    }
    // cap floor at 0
    confidence = Math.max(0, Math.round(confidence));

    const fallbackIsGoodTime = confidence >= 60 ? "Yes" : "No";
    isSeason = fallbackIsGoodTime === "Yes";

    const fallbackResponse = {
      confidence,
      is_good_time: fallbackIsGoodTime,
      explanation: fallbackIsGoodTime === "No" ? "The good planting window might be coming soon or has passed based on temperature and rainfall." : "",
      tip: "Check soil moisture; avoid planting into waterlogged furrows.",
      caution: "Watch for drought if no rain is forecasted."
    };
    adviceText = JSON.stringify(fallbackResponse);
  }

  // 7. store in season_tracker (use user_locations id)

  if (opts.mode === "recommendation" && isSeason) {
    const [inserted] = await pool`
    INSERT INTO recommendations
      (user_id, crop_id, user_location_id, confidence, tips, created_at)
    VALUES
      (${location.user_id}, ${crop.id}, ${location.id}, ${confidence}, ${adviceText}, NOW())
    RETURNING *;
  `;
    // 8. return a concise object
    return {
      cropId: crop.id,
      cropName: crop.common_name,
      locationId: location.id,
      locationName: location.name,
      avgTemp: Number(avgTemp.toFixed(1)),
      totalRain7d: Number(totalRain.toFixed(1)),
      daysWithRain,
      floodRisk,
      droughtRisk,
      confidence,
      isSeason,
      advice: adviceText,
      tracker: inserted
    };
  }
  else {
    const [inserted] = await pool`
    INSERT INTO season_tracker
      (crop_id, user_location_id, is_season, confidence, tips, created_at)
    VALUES
      (${crop.id}, ${location.id}, ${isSeason}, ${confidence}, ${adviceText}, NOW())
    RETURNING *;
  `;

    // 8. return a concise object
    return {
      cropId: crop.id,
      cropName: crop.common_name,
      locationId: location.id,
      locationName: location.name,
      avgTemp: Number(avgTemp.toFixed(1)),
      totalRain7d: Number(totalRain.toFixed(1)),
      daysWithRain,
      floodRisk,
      droughtRisk,
      confidence,
      isSeason,
      advice: adviceText,
      tracker: inserted
    };
  }



};