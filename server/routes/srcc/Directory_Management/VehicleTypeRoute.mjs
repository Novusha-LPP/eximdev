import express from "express";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";

const router = express.Router();

router.post("/api/add-vehicle-type", async (req, res) => {
  const {
    vehicleType,
    shortName,
    loadCapacity,
    engineCapacity,
    cargoTypeAllowed,
    CommodityCarry,
  } = req.body;

  try {
    const existingVehicle = await VehicleType.findOne({ vehicleType });
    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle type already exists" });
    }

    const newVehicle = await VehicleType.create({
      vehicleType,
      shortName,
      loadCapacity,
      engineCapacity,
      cargoTypeAllowed,
      CommodityCarry,
    });

    res.status(201).json({
      message: "Vehicle Type added successfully",
      data: newVehicle,
    });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/get-vehicle-type", async (req, res) => {
  try {
    const vehicles = await VehicleType.find();
    res.status(200).json({ data: vehicles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/get-vehicle-type/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await VehicleType.findById(id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.status(200).json({ data: vehicle });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/update-vehicle-type/:id", async (req, res) => {
  const { id } = req.params;
  const {
    vehicleType,
    shortName,
    loadCapacity,
    engineCapacity,
    cargoTypeAllowed,
    CommodityCarry,
  } = req.body;

  try {
    // Check if another vehicle has the same `vehicleType`
    const existingVehicle = await VehicleType.findOne({
      vehicleType,
      _id: { $ne: id },
    });

    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle type already exists" });
    }

    const updatedVehicle = await VehicleType.findByIdAndUpdate(
      id,
      {
        vehicleType,
        shortName,
        loadCapacity,
        engineCapacity,
        cargoTypeAllowed,
        CommodityCarry,
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.status(200).json({
      message: "Vehicle updated successfully",
      data: updatedVehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/delete-vehicle-type/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedVehicle = await VehicleType.findByIdAndDelete(id);
    if (!deletedVehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    res.status(200).json({
      message: "Vehicle deleted successfully",
      data: deletedVehicle,
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
