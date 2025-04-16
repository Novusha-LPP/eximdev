import express from "express";
import Country from "../../../model/srcc/Directory_Management/contryCode.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// 📌 1. Add a new country
router.post("/api/add-country",authenticateJWT, async (req, res) => {
  try {
    const newCountry = new Country(req.body);
    await newCountry.save();
    res
      .status(201)
      .json({ message: "Country added successfully!", country: newCountry });
  } catch (error) {
    console.error("Error adding country:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 2. Get all countries
router.get("/api/get-countries",authenticateJWT, async (req, res) => {
  try {
    const countries = await Country.find();
    res.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 3. Get a single country by ID
router.get("/api/get-country/:id",authenticateJWT, async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json(country);
  } catch (error) {
    console.error("Error fetching country:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 4. Update a country by ID
router.put("/api/update-country/:id",authenticateJWT, async (req, res) => {
  try {
    const updatedCountry = await Country.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCountry) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json({
      message: "Country updated successfully!",
      country: updatedCountry,
    });
  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// 📌 5. Delete a country by ID
router.delete("/api/delete-country/:id",authenticateJWT, async (req, res) => {
  try {
    const deletedCountry = await Country.findByIdAndDelete(req.params.id);
    if (!deletedCountry) {
      return res.status(404).json({ error: "Country not found" });
    }
    res.json({ message: "Country deleted successfully!" });
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
