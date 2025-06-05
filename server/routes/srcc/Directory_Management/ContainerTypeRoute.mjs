import express from "express";
import mongoose from "mongoose";
import ContainerType from "../../../model/srcc/containerType.mjs";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";

const router = express.Router();

// Helper function to populate unit data manually
const populateUnitData = async (containerTypes) => {
  // Get all unit measurements
  const allUnits = await UnitMeasurement.find({});
  // Create a map of measurement ID to measurement data
  const measurementMap = new Map();
  allUnits.forEach((unitDoc) => {
    unitDoc.measurements.forEach((measurement) => {
      measurementMap.set(measurement._id.toString(), {
        _id: measurement._id,
        unit: measurement.unit,
        symbol: measurement.symbol,
        decimal_places: measurement.decimal_places,
      });
    });
  });

  // Populate the container types
  const populatedContainers = containerTypes.map((container) => {
    const containerObj = container.toObject ? container.toObject() : container;

    // Populate outer_dimension.unit
    if (containerObj.outer_dimension?.unit) {
      const unitData = measurementMap.get(
        containerObj.outer_dimension.unit.toString()
      );
      containerObj.outer_dimension.unit =
        unitData || containerObj.outer_dimension.unit;
    }

    // Populate cubic_capacity.unit
    if (containerObj.cubic_capacity?.unit) {
      const unitData = measurementMap.get(
        containerObj.cubic_capacity.unit.toString()
      );
      containerObj.cubic_capacity.unit =
        unitData || containerObj.cubic_capacity.unit;
    }

    // Populate tare_weight.unit
    if (containerObj.tare_weight?.unit) {
      const unitData = measurementMap.get(
        containerObj.tare_weight.unit.toString()
      );
      containerObj.tare_weight.unit = unitData || containerObj.tare_weight.unit;
    }

    // Populate payload.unit
    if (containerObj.payload?.unit) {
      const unitData = measurementMap.get(containerObj.payload.unit.toString());
      containerObj.payload.unit = unitData || containerObj.payload.unit;
    }

    return containerObj;
  });

  return populatedContainers;
};

/**
 * @route POST /api/add-container-type
 * @desc Create a new container type
 */
router.post("/api/add-container-type", async (req, res) => {
  console.log("Received Data:", req.body);

  const {
    container_type,
    iso_code,
    teu,
    outer_dimension,
    cubic_capacity,
    tare_weight,
    payload,
    is_temp_controlled, // new field
    is_tank_container, // new field
    size, // new field
  } = req.body;

  try {
    if (!container_type) {
      return res.status(400).json({ error: "Container type is required" });
    }

    const existingContainer = await ContainerType.findOne({ iso_code });
    if (existingContainer) {
      return res
        .status(400)
        .json({ error: "Container type with this ISO code already exists" });
    }
    const newContainer = await ContainerType.create({
      container_type,
      iso_code,
      teu,
      outer_dimension,
      cubic_capacity, // added
      tare_weight,
      payload,
      is_temp_controlled, // added
      is_tank_container, // added
      size, // added
    });

    // Populate the unit references for the response
    const populatedContainer = await populateUnitData([newContainer]);

    res.status(201).json({
      message: "Container Type added successfully",
      data: populatedContainer[0],
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-container-types
 * @desc Retrieve all container types
 */
router.get("/api/get-container-types", async (req, res) => {
  try {
    const containerTypes = await ContainerType.find();
    const populatedContainers = await populateUnitData(containerTypes);
    res.status(200).json(populatedContainers);
  } catch (error) {
    console.error("Error fetching container types:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-container-type/:id
 * @desc Retrieve a single container type by ID
 */
router.get("/api/get-container-type/:id", async (req, res) => {
  try {
    const containerType = await ContainerType.findById(req.params.id);
    if (!containerType) {
      return res.status(404).json({ error: "Container type not found" });
    }
    const populatedContainer = await populateUnitData([containerType]);
    res.status(200).json(populatedContainer[0]);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/update-container-type/:id
 * @desc Update an existing container type
 */
router.put("/api/update-container-type/:id", async (req, res) => {
  try {
    const {
      container_type,
      iso_code,
      teu,
      outer_dimension,
      cubic_capacity,
      tare_weight,
      payload,
      is_temp_controlled, // new field
      is_tank_container, // new field
      size, // new field
    } = req.body;

    if (!req.params.id) {
      return res.status(400).json({ error: "Container type ID is required" });
    }
    const updatedContainer = await ContainerType.findByIdAndUpdate(
      req.params.id,
      {
        container_type,
        iso_code,
        teu,
        outer_dimension,
        cubic_capacity, // added
        tare_weight,
        payload,
        is_temp_controlled, // added
        is_tank_container, // added
        size, // added
      },
      { new: true, runValidators: true }
    );

    if (!updatedContainer) {
      return res.status(404).json({ error: "Container type not found" });
    }

    // Populate the unit references for the response
    const populatedContainer = await populateUnitData([updatedContainer]);

    res.status(200).json({
      message: "Container type updated successfully",
      data: populatedContainer[0],
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-container-type/:id
 * @desc Delete a container type
 */
router.delete("/api/delete-container-type/:id", async (req, res) => {
  try {
    const deletedContainer = await ContainerType.findByIdAndDelete(
      req.params.id
    );
    if (!deletedContainer) {
      return res.status(404).json({ error: "Container type not found" });
    }
    res.status(200).json({ message: "Container type deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
