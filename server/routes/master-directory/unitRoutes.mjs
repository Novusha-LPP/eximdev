import express from "express";
import UnitModel from "../../model/unitModel.mjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get all units
router.get("/get-units", async (req, res) => {
  try {
    const units = await UnitModel.find().sort({ name: 1 });
    res.status(200).json(units);
  } catch (error) {
    console.error("Error fetching units:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add a unit
router.post("/add-unit", async (req, res) => {
  try {
    const unit = new UnitModel(req.body);
    await unit.save();
    res.status(201).json({ message: "Unit added successfully", unit });
  } catch (error) {
    console.error("Error adding unit:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update a unit
router.put("/update-unit/:id", async (req, res) => {
  try {
    const updatedUnit = await UnitModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedUnit) {
      return res.status(404).json({ message: "Unit not found" });
    }
    res.status(200).json({ message: "Unit updated successfully", unit: updatedUnit });
  } catch (error) {
    console.error("Error updating unit:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Seed units from server JSON
router.post("/seed-units", async (req, res) => {
  try {
    const dataPath = path.join(__dirname, "../../utils/data/units.json");
    const data = await fs.readFile(dataPath, "utf-8");
    const units = JSON.parse(data);
    
    await UnitModel.insertMany(units, { ordered: false });
    res.status(201).json({ message: "Units seeded successfully" });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(201).json({ message: "Seeding complete with duplicates ignored." });
    }
    console.error("Error seeding units:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
