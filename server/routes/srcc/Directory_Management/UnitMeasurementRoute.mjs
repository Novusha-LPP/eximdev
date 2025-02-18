import express from "express";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";

const router = express.Router();

/**
 * @route POST /api/add-unit-measurement
 * @desc Create a new unit measurement
 */
router.post("/api/add-unit-measurement", async (req, res) => {
  const { name, symbol, unit_type, decimal_places } = req.body;
  

  try {
    const existingUnit = await UnitMeasurement.findOne({ name });
    if (existingUnit) {
      return res.status(400).json({ error: "Unit measurement already exists" });
    }

    const newUnit = await UnitMeasurement.create({
      name,
      symbol,
      unit_type,
      decimal_places,
    });
    res
      .status(201)
      .json({ message: "Unit Measurement added successfully", data: newUnit });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-unit-measurements
 * @desc Retrieve all unit measurements
 */
router.get("/api/get-unit-measurements", async (req, res) => {
  try {
    const unitMeasurements = await UnitMeasurement.find();
    res.status(200).json(unitMeasurements);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-unit-measurement/:id
 * @desc Retrieve a single unit measurement by ID
 */
router.get("/api/get-unit-measurement/:id", async (req, res) => {
  try {
    const unitMeasurement = await UnitMeasurement.findById(req.params.id);
    if (!unitMeasurement) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }
    res.status(200).json(unitMeasurement);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/update-unit-measurement/:id
 * @desc Update an existing unit measurement
 */
router.put("/api/update-unit-measurement/:id", async (req, res) => {
  try {
    const { name, symbol, unit_type, decimal_places } = req.body;

    const existingUnit = await UnitMeasurement.findOne({
      name,
      _id: { $ne: req.params.id },
    });
    if (existingUnit) {
      return res
        .status(400)
        .json({
          error: "Unit measurement with this name already exists",
        });
    }

    const updatedUnit = await UnitMeasurement.findByIdAndUpdate(
      req.params.id,
      { name, symbol, unit_type, decimal_places },
      { new: true, runValidators: true }
    );

    if (!updatedUnit) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }

    res
      .status(200)
      .json({
        message: "Unit measurement updated successfully",
        data: updatedUnit,
      });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-unit-measurement/:id
 * @desc Delete a unit measurement
 */
router.delete("/api/delete-unit-measurement/:id", async (req, res) => {
  try {
    const deletedUnit = await UnitMeasurement.findByIdAndDelete(req.params.id);
    if (!deletedUnit) {
      return res.status(404).json({ error: "Unit measurement not found" });
    }
    res.status(200).json({ message: "Unit measurement deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
