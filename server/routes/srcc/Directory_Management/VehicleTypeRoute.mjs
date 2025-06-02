// routes/vehicleTypeRoutes.js
import express from "express";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";
import CommodityCode from "../../../model/srcc/Directory_Management/Commodity.mjs";

const router = express.Router();

// Helper function to populate unit and commodity data
const populateVehicleData = async (vehicle) => {
  const vehicleObj = vehicle.toObject();

  // Get all unit measurements and create a map
  const allUnits = await UnitMeasurement.find({});
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

  // Populate loadCapacity unit
  if (vehicleObj.loadCapacity?.unit) {
    const unitData = measurementMap.get(
      vehicleObj.loadCapacity.unit.toString()
    );
    vehicleObj.loadCapacity.unit = unitData || vehicleObj.loadCapacity.unit;
  }

  // Populate engineCapacity unit
  if (vehicleObj.engineCapacity?.unit) {
    const unitData = measurementMap.get(
      vehicleObj.engineCapacity.unit.toString()
    );
    vehicleObj.engineCapacity.unit = unitData || vehicleObj.engineCapacity.unit;
  }

  // Populate CommodityCarry
  if (vehicleObj.CommodityCarry?.length > 0) {
    const commodities = await CommodityCode.find({
      _id: { $in: vehicleObj.CommodityCarry },
    });
    vehicleObj.CommodityCarry = commodities.map((commodity) => ({
      _id: commodity._id,
      name: commodity.name,
      hsn_code: commodity.hsn_code,
      description: commodity.description,
    }));
  }

  return vehicleObj;
};

// Add Vehicle Type
router.post("/api/vehicle-types", async (req, res) => {
  try {
    const { vehicleType } = req.body;
    const existingVehicle = await VehicleType.findOne({ vehicleType });

    if (existingVehicle) {
      return res.status(409).json({ error: "Vehicle type already exists." });
    }

    const newVehicle = await VehicleType.create(req.body);
    const populatedVehicle = await populateVehicleData(newVehicle);
    res.status(201).json({
      message: "Vehicle type added successfully.",
      data: populatedVehicle,
    });
  } catch (error) {
    console.error("Error adding vehicle type:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get All Vehicle Types
router.get("/api/vehicle-types", async (req, res) => {
  try {
    const vehicles = await VehicleType.find();
    const populatedVehicles = await Promise.all(
      vehicles.map((vehicle) => populateVehicleData(vehicle))
    );
    res.status(200).json({ data: populatedVehicles });
  } catch (error) {
    console.error("Error fetching vehicle types:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get Vehicle Type by ID
router.get("/api/vehicle-types/:id", async (req, res) => {
  try {
    const vehicle = await VehicleType.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle type not found." });
    }
    const populatedVehicle = await populateVehicleData(vehicle);
    res.status(200).json({ data: populatedVehicle });
  } catch (error) {
    console.error("Error fetching vehicle type:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Update Vehicle Type by ID
router.put("/api/vehicle-types/:id", async (req, res) => {
  try {
    const { vehicleType } = req.body;

    const duplicateVehicle = await VehicleType.findOne({
      vehicleType,
      _id: { $ne: req.params.id },
    });

    if (duplicateVehicle) {
      return res.status(409).json({ error: "Vehicle type already exists." });
    }

    const updatedVehicle = await VehicleType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ error: "Vehicle type not found." });
    }

    const populatedVehicle = await populateVehicleData(updatedVehicle);
    res.status(200).json({
      message: "Vehicle type updated successfully.",
      data: populatedVehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle type:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Delete Vehicle Type by ID
router.delete("/api/vehicle-types/:id", async (req, res) => {
  try {
    const deletedVehicle = await VehicleType.findByIdAndDelete(req.params.id);

    if (!deletedVehicle) {
      return res.status(404).json({ error: "Vehicle type not found." });
    }

    res.status(200).json({
      message: "Vehicle type deleted successfully.",
      data: deletedVehicle,
    });
  } catch (error) {
    console.error("Error deleting vehicle type:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
