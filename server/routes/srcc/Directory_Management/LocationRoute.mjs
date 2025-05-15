import express from "express";
import mongoose from "mongoose";
import Location from "../../../model/srcc/Directory_Management/location.mjs"; // Ensure correct path
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

/**
 * @route POST /api/add-location
 * @desc Create a new location
 */
router.post("/api/add-location",authenticateJWT, async (req, res) => {
  const { name, postal_code, city, district, state, country } = req.body;

  try {
    if (!postal_code || postal_code.length !== 6) {
      return res.status(400).json({ error: "Postal code must be 6 digits" });
    }

    const existingLocation = await Location.findOne({ postal_code });
    if (existingLocation) {
      return res
        .status(400)
        .json({ error: "Location with this postal code already exists" });
    }

    const newLocation = await Location.create({
      name,
      postal_code,
      city,
      district,
      state,
      country,
    });

    res.status(201).json({
      message: "✅ Location added successfully",
      data: newLocation,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/api/location-names",authenticateJWT, async (req, res) => {
  try {
    // Get only the "name" field from each document
    const locations = await Location.find({}, "name");

    // Extract the name field into a plain array of strings
    const nameArray = locations.map((loc) => loc.name);

    res.status(200).json(nameArray); // Send array: ["loc1", "loc2", ...]
  } catch (error) {
    console.error("❌ Error fetching location names:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-location
 * @desc Retrieve all locations
 */
router.get("/api/get-location",authenticateJWT, async (req, res) => {
  try {
    const locations = await Location.find();
   
    res.status(200).json(locations);
  } catch (error) {
    console.error("❌ Error fetching locations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/update-location/:id
 * @desc Update an existing location
 */
router.put("/api/update-location/:id",authenticateJWT, async (req, res) => {
  try {
    const { name, postal_code, city, district, state, country } = req.body;

    if (!req.params.id) {
      return res.status(400).json({ error: "Location ID is required" });
    }

    const updatedLocation = await Location.findByIdAndUpdate(
      req.params.id,
      { name, postal_code, city, district, state, country },
      { new: true, runValidators: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.status(200).json({
      message: "✅ Location updated successfully",
      data: updatedLocation,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-location/:id
 * @desc Delete a location
 */
router.delete("/api/delete-location/:id",authenticateJWT, async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);
    if (!deletedLocation) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.status(200).json({ message: "✅ Location deleted successfully" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
