import express from "express";
import TollData from "../../../model/srcc/Directory_Management/TollData.mjs"; // Adjust the path to your model
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// CREATE: Add new Toll Data
router.post("/api/add-toll-data", async (req, res) => {
  const {
    tollBoothName,
    vehicleType,
    fastagClassId,
    singleAmount,
    returnAmount,
    secondPassTollBooth,
  } = req.body;

  try {
    // Optional: check if toll data already exists for the same booth/vehicleType
    // If you want a uniqueness rule, do that here.

    const newTollData = await TollData.create({
      tollBoothName,
      vehicleType,
      fastagClassId,
      singleAmount,
      returnAmount,
      secondPassTollBooth,
    });

    res.status(201).json({
      message: "Toll data added successfully",
      data: newTollData,
    });
  } catch (error) {
    console.error("❌ Error adding Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL: Get all Toll Data
router.get("/api/get-toll-data",authenticateJWT, async (req, res) => {
  try {
    const tollDataList = await TollData.find();
    res.status(200).json({ data: tollDataList });
  } catch (error) {
    console.error("❌ Error fetching Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE: Get Toll Data by ID
router.get("/api/get-toll-data/:id",authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const tollDataItem = await TollData.findById(id);
    if (!tollDataItem) {
      return res.status(404).json({ error: "Toll data not found" });
    }
    res.status(200).json({ data: tollDataItem });
  } catch (error) {
    console.error("❌ Error fetching Toll Data by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE: Update Toll Data
router.put("/api/update-toll-data/:id", async (req, res) => {
  const { id } = req.params;
  const {
    tollBoothName,
    vehicleType,
    fastagClassId,
    singleAmount,
    returnAmount,
    secondPassTollBooth,
  } = req.body;

  try {
    // Optional uniqueness checks

    const updatedTollData = await TollData.findByIdAndUpdate(
      id,
      {
        tollBoothName,
        vehicleType,
        fastagClassId,
        singleAmount,
        returnAmount,
        secondPassTollBooth,
      },
      { new: true }
    );

    if (!updatedTollData) {
      return res.status(404).json({ error: "Toll data not found" });
    }

    res.status(200).json({
      message: "Toll data updated successfully",
      data: updatedTollData,
    });
  } catch (error) {
    console.error("❌ Error updating Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete Toll Data
router.delete("/api/delete-toll-data/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTollData = await TollData.findByIdAndDelete(id);
    if (!deletedTollData) {
      return res.status(404).json({ error: "Toll data not found" });
    }
    res.status(200).json({
      message: "Toll data deleted successfully",
      data: deletedTollData,
    });
  } catch (error) {
    console.error("❌ Error deleting Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
