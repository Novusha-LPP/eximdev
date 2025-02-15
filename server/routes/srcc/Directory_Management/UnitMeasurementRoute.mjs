import express from "express";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";

const router = express.Router();

// Create new unit measurement
router.post("/api/unit-measurement", async (req, res) => {
  try {
    const { description, code, unit_type, decimal_places } = req.body;

    // Check for duplicate description
    const existingUnit = await UnitMeasurement.findOne({ description });
    if (existingUnit) {
      return res.status(400).json({
        error: "Unit measurement with this description already exists",
      });
    }

    const newUnitMeasurement = await UnitMeasurement.create({
      description,
      code,
      unit_type,
      decimal_places,
    });

    res.status(201).json({
      message: "Unit measurement added successfully",
      data: newUnitMeasurement,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all unit measurements
router.get("/api/unit-measurements", async (req, res) => {
  try {
    const unitMeasurements = await UnitMeasurement.find();
    res.status(200).json(unitMeasurements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single unit measurement by ID
router.get("/api/unit-measurement/:id", async (req, res) => {
  try {
    const unitMeasurement = await UnitMeasurement.findById(req.params.id);
    if (!unitMeasurement) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }
    res.status(200).json(unitMeasurement);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update unit measurement
router.put("/api/unit-measurement/:id", async (req, res) => {
  try {
    const { description, code, unit_type, decimal_places } = req.body;

    // Check for duplicate description but exclude current record
    const existingUnit = await UnitMeasurement.findOne({
      description,
      _id: { $ne: req.params.id },
    });

    if (existingUnit) {
      return res.status(400).json({
        error: "Unit measurement with this description already exists",
      });
    }

    const updatedUnit = await UnitMeasurement.findByIdAndUpdate(
      req.params.id,
      { description, code, unit_type, decimal_places },
      { new: true, runValidators: true }
    );

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }

    res.status(200).json({
      message: "Unit measurement updated successfully",
      data: updatedUnit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete unit measurement
router.delete("/api/unit-measurement/:id", async (req, res) => {
  try {
    const deletedUnit = await UnitMeasurement.findByIdAndDelete(req.params.id);
    if (!deletedUnit) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }
    res.status(200).json({
      message: "Unit measurement deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
