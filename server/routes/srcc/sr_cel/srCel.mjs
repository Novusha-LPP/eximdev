import express from "express";
import SrcelModel from "../../../model/srcc/sr_cel/srCel.mjs"; // Adjust the path as needed
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// GET all data
router.get("/api/get-all-srcel", authenticateJWT, async (req, res) => {
  try {
    const data = await SrcelModel.find();
    res.status(200).json(data);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching data", error: error.message });
  }
});

router.post("/api/add-srcel", async (req, res) => {
  try {

    const { FObject } = req.body;
    if (!Array.isArray(FObject) || FObject.length === 0) {
      return res
        .status(400)
        .json({ message: "FObject must be a non-empty array" });
    }

    // We'll use the first object in the array
    const newEntry = new SrcelModel(FObject[0]);
    
    const savedEntry = await newEntry.save();
    
    res.status(201).json(savedEntry);
  } catch (error) {
    console.error("Error saving data:", error);
    res
      .status(500)
      .json({ message: "Error saving data", error: error.message });
  }
});

// PATCH specific data
router.patch("/api/get-srcel/:id", async (req, res) => {
  const { id } = req.params;
  const update = req.body;

  try {
    const updatedData = await SrcelModel.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!updatedData) {
      return res.status(404).json({ message: "Data not found" });
    }

    res.status(200).json(updatedData);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating data", error: error.message });
  }
});

export default router;
