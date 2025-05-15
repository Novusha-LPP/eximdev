// routes/vehicleTypeRoutes.js
import express from "express";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// Add Vehicle Type
router.post("/api/vehicle-types", async (req, res) => {
  try {
    const { vehicleType } = req.body;
    const existingVehicle = await VehicleType.findOne({ vehicleType });

    if (existingVehicle) {
      return res.status(409).json({ error: "Vehicle type already exists." });
    }

    const newVehicle = await VehicleType.create(req.body);
    res.status(201).json({
      message: "Vehicle type added successfully.",
      data: newVehicle,
    });
  } catch (error) {
    console.error("Error adding vehicle type:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get All Vehicle Types
router.get("/api/vehicle-types", authenticateJWT, async (req, res) => {
  try {
    const vehicles = await VehicleType.find();
    res.status(200).json({ data: vehicles });
  } catch (error) {
    console.error("Error fetching vehicle types:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get Vehicle Type by ID
router.get("/api/vehicle-types/:id", authenticateJWT, async (req, res) => {
  try {
    const vehicle = await VehicleType.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle type not found." });
    }
    res.status(200).json({ data: vehicle });
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

    res.status(200).json({
      message: "Vehicle type updated successfully.",
      data: updatedVehicle,
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
