import express from "express";
import mongoose from "mongoose"; // Add this line
import VehicleRegistration from "../../../model/srcc/Directory_Management/VehicleRegistration.mjs";
import DriverType from "../../../model/srcc/Directory_Management/Driver.mjs";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";
import PortICDcode from "../../../model/srcc/Directory_Management/PortsCfsYard.mjs";
import UnitMeasurement from "../../../model/srcc/Directory_Management/UnitMeasurementModal.mjs";

const router = express.Router();

// Helper function to populate vehicle registration data
const populateVehicleRegistrationData = async (vehicleRegistration) => {
  try {
    const populated = await VehicleRegistration.populate(vehicleRegistration, [
      {
        path: "type",
        select: "_id vehicleType shortName",
      },
      {
        path: "depotName",
        select: "_id name icd_code state country",
      },
      {
        path: "initialOdometer.unit",
        select: "_id name measurements",
      },
      {
        path: "loadCapacity.unit",
        select: "_id name measurements",
      },
    ]);
    return populated;
  } catch (error) {
    console.error("Error populating vehicle registration data:", error);
    return vehicleRegistration;
  }
};

// Function to validate vehicle number format (MH12XX1234 or mh12xx1234)
const isValidVehicleNumber = (vehicleNumber) => {
  const regex = /^[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{4}$/;
  return regex.test(vehicleNumber);
};

// CREATE a Vehicle Registration
router.post("/api/add-vehicle-registration", async (req, res) => {
  const {
    vehicleNumber,
    registrationName,
    type, // Should be an ObjectId
    shortName,
    depotName,
    initialOdometer,
    loadCapacity,
    driver,
    purchase,
    vehicleManufacturingDetails,
  } = req.body;

  try {
    // Validate type as ObjectId
    if (!mongoose.Types.ObjectId.isValid(type)) {
      return res.status(400).json({ error: "Invalid vehicle type ID" });
    }
    const newRegistration = await VehicleRegistration.create({
      vehicleNumber,
      registrationName,
      type,
      shortName,
      depotName,
      initialOdometer,
      loadCapacity,
      driver,
      purchase,
      vehicleManufacturingDetails,
    });

    // Populate the created vehicle registration data
    const populatedRegistration = await populateVehicleRegistrationData(
      newRegistration
    );

    res.status(201).json({
      message: "Vehicle registration added successfully",
      data: populatedRegistration,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: `Duplicate key error: ${Object.keys(error.keyValue).join(
          ", "
        )} already exists.`,
      });
    }
    console.error("Error adding vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE a Vehicle Registration
router.put("/api/update-vehicle-registration/:id", async (req, res) => {
  const { id } = req.params;
  const {
    vehicleNumber,
    registrationName,
    type, // Should be an ObjectId
    shortName,
    depotName,
    initialOdometer,
    loadCapacity,
    driver,
    purchase,
    vehicleManufacturingDetails,
  } = req.body;

  try {
    // Validate type as ObjectId
    if (!mongoose.Types.ObjectId.isValid(type)) {
      return res.status(400).json({ error: "Invalid vehicle type ID" });
    }

    const updatedRegistration = await VehicleRegistration.findByIdAndUpdate(
      id,
      {
        vehicleNumber,
        registrationName,
        type,
        shortName,
        depotName,
        initialOdometer,
        loadCapacity,
        driver,
        purchase,
        vehicleManufacturingDetails,
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Vehicle registration updated successfully",
      data: updatedRegistration,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: `Duplicate key error: ${Object.keys(error.keyValue).join(
          ", "
        )} already exists.`,
      });
    }
    console.error("Error updating vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ all Vehicle Registrations
router.get("/api/get-vehicle-registration", async (req, res) => {
  try {
    const registrations = await VehicleRegistration.find();

    // Populate all vehicle registrations
    const populatedRegistrations = await Promise.all(
      registrations.map((registration) =>
        populateVehicleRegistrationData(registration)
      )
    );

    res.status(200).json({ data: populatedRegistrations });
  } catch (error) {
    console.error("Error fetching vehicle registrations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ a single Vehicle Registration by ID
router.get("/api/get-vehicle-registration/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const registration = await VehicleRegistration.findById(id);
    if (!registration) {
      return res.status(404).json({ error: "Vehicle registration not found" });
    }

    // Populate the vehicle registration data
    const populatedRegistration = await populateVehicleRegistrationData(
      registration
    );

    res.status(200).json({ data: populatedRegistration });
  } catch (error) {
    console.error("Error fetching vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE a Vehicle Registration
router.put("/api/update-vehicle-registration/:id", async (req, res) => {
  const { id } = req.params;
  const {
    vehicleNumber,
    registrationName,
    type,
    shortName,
    depotName,
    initialOdometer,
    loadCapacity,
    driver,
    purchase,
    vehicleManufacturingDetails,
  } = req.body;

  try {
    // Check if vehicle number is valid
    if (vehicleNumber && !isValidVehicleNumber(vehicleNumber)) {
      return res.status(400).json({
        error: "Invalid vehicle number format. Should be like MH12XX1234.",
      });
    }

    // Check if another registration has the same registrationName or vehicleNumber
    const existingRegistration = await VehicleRegistration.findOne({
      $or: [
        { registrationName, _id: { $ne: id } },
        { vehicleNumber, _id: { $ne: id } },
      ],
    });

    if (existingRegistration) {
      return res.status(400).json({
        error: "Vehicle registration or vehicle number already exists",
      });
    }

    // Find the existing vehicle registration to check previous driver
    const currentRegistration = await VehicleRegistration.findById(id);
    if (!currentRegistration) {
      return res.status(404).json({ error: "Vehicle registration not found" });
    }

    const previousDriver = currentRegistration.driver;

    // If driver is changed, unassign the old driver and assign the new one
    if (driver && previousDriver._id.toString() !== driver._id.toString()) {
      await DriverType.findOneAndUpdate(
        { _id: previousDriver._id },
        { isAssigned: false }
      );

      const assignedDriver = await DriverType.findOne({
        _id: driver._id,
        isAssigned: true,
      });

      if (assignedDriver) {
        return res.status(400).json({
          error: `Driver ${driver.name} is already assigned to another vehicle.`,
        });
      }

      await DriverType.findOneAndUpdate(
        { _id: driver._id },
        { isAssigned: true }
      );
    } // Update vehicle registration
    const updatedRegistration = await VehicleRegistration.findByIdAndUpdate(
      id,
      {
        vehicleNumber,
        registrationName,
        type,
        shortName,
        depotName,
        initialOdometer,
        loadCapacity,
        driver,
        purchase,
        vehicleManufacturingDetails,
      },
      { new: true }
    );

    // Populate the updated vehicle registration data
    const populatedRegistration = await populateVehicleRegistrationData(
      updatedRegistration
    );

    res.status(200).json({
      message: "Vehicle registration updated successfully",
      data: populatedRegistration,
    });
  } catch (error) {
    console.error("Error updating vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a Vehicle Registration
router.delete("/api/delete-vehicle-registration/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRegistration = await VehicleRegistration.findByIdAndDelete(id);
    if (!deletedRegistration) {
      return res.status(404).json({ error: "Vehicle registration not found" });
    }

    // Unassign the driver associated with this vehicle
    const driver = deletedRegistration.driver;
    if (driver) {
      await DriverType.findOneAndUpdate(
        { _id: driver._id },
        { isAssigned: false },
        { new: true }
      );
    }

    res.status(200).json({
      message: "Vehicle registration deleted successfully",
      data: deletedRegistration,
    });
  } catch (error) {
    console.error("Error deleting vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/vehicles", async (req, res) => {
  console.log("GET /vehicles hit"); // Debugging log
  try {
    const { type_of_vehicle } = req.query;
    console.log("Received type_of_vehicle:", type_of_vehicle); // Debugging log

    if (!type_of_vehicle) {
      return res.status(400).json({ message: "type_of_vehicle is required" });
    }
    const vehicles = await VehicleRegistration.find();

    // Populate all vehicle registrations
    const populatedVehicles = await Promise.all(
      vehicles.map((vehicle) => populateVehicleRegistrationData(vehicle))
    );

    console.log("Fetched vehicles:", populatedVehicles); // Debugging log

    const filteredVehicles = populatedVehicles.filter(
      (vehicle) => vehicle.type?.vehicleType === type_of_vehicle
    );

    console.log("Filtered Vehicles:", filteredVehicles); // Debugging log

    if (filteredVehicles.length === 0) {
      return res
        .status(404)
        .json({ message: "No vehicles found for this type." });
    }

    const drivers = filteredVehicles.map((vehicle) => ({
      vehicleNumber_id: vehicle._id,
      isOccupied: vehicle.isOccupied,
      vehicleNumber: vehicle.vehicleNumber,
      driverName: vehicle.driver.name,
      driverPhone: vehicle.driver.phoneNumber,
    }));

    res.status(200).json({ drivers });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// PATCH API to update isOccupied value
router.patch("/api/update-vehicle-occupied/:id", async (req, res) => {
  const { id } = req.params;
  const { isOccupied } = req.body;

  try {
    if (typeof isOccupied !== "boolean") {
      return res
        .status(400)
        .json({ error: "isOccupied must be a boolean value" });
    }

    const updatedRegistration = await VehicleRegistration.findByIdAndUpdate(
      id,
      { isOccupied },
      { new: true }
    );

    if (!updatedRegistration) {
      return res.status(404).json({ error: "Vehicle registration not found" });
    }

    res.status(200).json({
      message: "isOccupied value updated successfully",
      data: updatedRegistration,
    });
  } catch (error) {
    console.error("Error updating isOccupied value:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
