// controllers/locationController.js
import fetch from "node-fetch";
import { addUserLocation, getUserLocations, deleteUserLocation } from "../models/locationModel.js";

export const suggestLocations = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=200`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch location suggestions");
    }

    const data = await response.json();

    // Photon returns GeoJSON { features: [...] }
    const results = data.features.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;

      return {
        name: feature.properties.name || feature.properties.street || "Unknown",
        city: feature.properties.city,
        state: feature.properties.state,
        country: feature.properties.country,
        lon,
        lat,
      };
    }).filter((loc) => loc.country === "Nigeria");

    res.json(results);
  } catch (err) {
    console.error("❌ Location suggest error:", err.message);
    res.status(500).json({ error: "Failed to fetch location suggestions" });
  }
};




export const createLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, latitude, longitude, source } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ msg: "Name, latitude and longitude are required" });
    }

    const location = await addUserLocation({ userId, name, latitude, longitude, source });
    res.status(201).json(location);
  } catch (err) {
    console.error("createLocation error:", err.message);
    res.status(500).json({ error: "Failed to add location" });
  }
};

export const listLocations = async (req, res) => {
  try {
    const userId = req.user.id;
    const locations = await getUserLocations(userId);
    res.status(200).json(locations);
  } catch (err) {
    console.error("listLocations error:", err.message);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
};

export const removeLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await deleteUserLocation(id, userId);
    res.status(200).json({ msg: "Location removed" });
  } catch (err) {
    console.error("removeLocation error:", err.message);
    res.status(500).json({ error: "Failed to delete location" });
  }
};
