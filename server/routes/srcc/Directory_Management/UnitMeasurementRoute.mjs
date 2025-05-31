import express from "express";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";

const router = express.Router();

/**
 * @route POST /api/add-unit-measurement
 * @desc Create a new unit measurement category with measurements
 */
router.post("/api/add-unit-measurement", async (req, res) => {
  const { name, measurements } = req.body;

  try {
    const existingUnit = await UnitMeasurement.findOne({ name });
    if (existingUnit) {
      return res.status(400).json({ error: "Unit measurement already exists" });
    }

    // Check for duplicate measurements within the same category
    if (measurements && measurements.length > 0) {
      const unitSymbolPairs = new Set();
      for (const measurement of measurements) {
        const pair = `${measurement.unit}-${measurement.symbol}`;
        if (unitSymbolPairs.has(pair)) {
          return res.status(400).json({
            error: `Duplicate measurement found: ${measurement.unit} (${measurement.symbol})`,
          });
        }
        unitSymbolPairs.add(pair);
      }
    }

    const newUnit = await UnitMeasurement.create({ name, measurements });
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
 * @desc Retrieve all unit measurement categories
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
 * @desc Update a unit measurement category and its measurements
 */
router.put("/api/update-unit-measurement/:id", async (req, res) => {
  try {
    const { name, measurements } = req.body;

    const existingUnit = await UnitMeasurement.findOne({
      name,
      _id: { $ne: req.params.id },
    });
    if (existingUnit) {
      return res
        .status(400)
        .json({ error: "Unit measurement with this name already exists" });
    }

    // Check for duplicate measurements within the same category
    if (measurements && measurements.length > 0) {
      const unitSymbolPairs = new Set();
      for (const measurement of measurements) {
        const pair = `${measurement.unit}-${measurement.symbol}`;
        if (unitSymbolPairs.has(pair)) {
          return res.status(400).json({
            error: `Duplicate measurement found: ${measurement.unit} (${measurement.symbol})`,
          });
        }
        unitSymbolPairs.add(pair);
      }
    }

    const updatedUnit = await UnitMeasurement.findByIdAndUpdate(
      req.params.id,
      { name, measurements },
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
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-unit-measurement/:id
 * @desc Delete a unit measurement category
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
