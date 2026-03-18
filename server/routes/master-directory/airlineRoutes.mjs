import express from "express";
import AirlineModel from "../../model/airlineModel.mjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get all airlines
router.get("/get-airlines", async (req, res) => {
  try {
    const airlines = await AirlineModel.find().sort({ name: 1 });
    res.status(200).json(airlines);
  } catch (error) {
    console.error("Error fetching airlines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add an airline
router.post("/add-airline", async (req, res) => {
  try {
    const airline = new AirlineModel(req.body);
    await airline.save();
    res.status(201).json({ message: "Airline added successfully", airline });
  } catch (error) {
    console.error("Error adding airline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update an airline
router.put("/update-airline/:id", async (req, res) => {
  try {
    const updatedAirline = await AirlineModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedAirline) {
      return res.status(404).json({ message: "Airline not found" });
    }
    res.status(200).json({ message: "Airline updated successfully", airline: updatedAirline });
  } catch (error) {
    console.error("Error updating airline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Seed airlines from server JSON
router.post("/seed-airlines", async (req, res) => {
  try {
    const dataPath = path.join(__dirname, "../../utils/data/airlines.json");
    const data = await fs.readFile(dataPath, "utf-8");
    const airlines = JSON.parse(data);
    
    await AirlineModel.insertMany(airlines, { ordered: false });
    res.status(201).json({ message: "Airlines seeded successfully" });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(201).json({ message: "Seeding complete with duplicates ignored." });
    }
    console.error("Error seeding airlines:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
