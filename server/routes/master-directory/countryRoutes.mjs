import express from "express";
import CountryModel from "../../model/countryModel.mjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get all countries
router.get("/get-countries", async (req, res) => {
  try {
    const countries = await CountryModel.find().sort({ name: 1 });
    res.status(200).json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a country
router.post("/add-country", async (req, res) => {
  try {
    const { name, code } = req.body;
    const country = new CountryModel({ name, code });
    await country.save();
    res.status(201).json({ message: "Country added successfully", country });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Country name or code already exists" });
    }
    console.error("Error adding country:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a country
router.put("/update-country/:id", async (req, res) => {
  try {
    const { name, code } = req.body;
    const updatedCountry = await CountryModel.findByIdAndUpdate(
      req.params.id,
      { name, code },
      { new: true, runValidators: true }
    );
    if (!updatedCountry) {
      return res.status(404).json({ message: "Country not found" });
    }
    res.status(200).json({ message: "Country updated successfully", country: updatedCountry });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Country name or code already exists" });
    }
    console.error("Error updating country:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Seed countries from server JSON
router.post("/seed-countries", async (req, res) => {
    try {
        const dataPath = path.join(__dirname, "../../utils/data/countries.json");
        const data = await fs.readFile(dataPath, "utf-8");
        const countries = JSON.parse(data);
        
        await CountryModel.insertMany(countries, { ordered: false });
        res.status(201).json({ message: "Countries seeded successfully" });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(201).json({ message: "Seeding complete with duplicates ignored." });
        }
        console.error("Error seeding countries:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
