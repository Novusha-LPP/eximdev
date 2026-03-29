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
    if (error.code === 11000) {
      return res.status(400).json({ message: "Airline name already exists" });
    }
    console.error("Error adding airline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update an airline
router.put("/update-airline/:id", async (req, res) => {
  try {
    const airline = await AirlineModel.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ message: "Airline not found" });
    }
    
    airline.set(req.body);
    
    await airline.save();
    res.status(200).json({ message: "Airline updated successfully", airline });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Airline name already exists" });
    }
    console.error("Error updating airline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete an airline
router.delete("/delete-airline/:id", async (req, res) => {
  try {
    const deleted = await AirlineModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Airline not found" });
    }
    res.status(200).json({ message: "Airline deleted successfully" });
  } catch (error) {
    console.error("Error deleting airline:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific branch from an airline
router.delete("/delete-airline/:id/branch/:branchId", async (req, res) => {
  try {
    const airline = await AirlineModel.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ message: "Airline not found" });
    }
    
    airline.branches = airline.branches.filter(
      (b) => b._id.toString() !== req.params.branchId
    );
    
    await airline.save();
    res.status(200).json({ message: "Branch deleted successfully", airline });
  } catch (error) {
    console.error("Error deleting branch:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete a specific bank account from a branch in an airline
router.delete("/delete-airline/:id/branch/:branchId/account/:accountId", async (req, res) => {
  try {
    const airline = await AirlineModel.findById(req.params.id);
    if (!airline) {
      return res.status(404).json({ message: "Airline not found" });
    }
    
    const branch = airline.branches.id(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }
    
    branch.accounts = branch.accounts.filter(
      (acc) => acc._id.toString() !== req.params.accountId
    );
    
    await airline.save();
    res.status(200).json({ message: "Bank account deleted successfully", airline });
  } catch (error) {
    console.error("Error deleting bank account:", error);
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
