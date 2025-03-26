import express from "express";
import VehicleRegistration from "../../../model/srcc/Directory_Management/VehicleRegistration.mjs";
import DriverType from "../../../model/srcc/Directory_Management/Driver.mjs";

const router = express.Router();

// CREATE a Vehicle Registration
router.post("/api/add-vehicle-registration", async (req, res) => {
  const {
    registrationName,
    type,
    shortName,
    depotName,
    initialOdometer,
    odometerUnit, // <-- add this
    loadCapacity,
    loadCapacityUnit, // <-- add this
    driver,
    purchase,
    vehicleManufacturingDetails,
  } = req.body;

  try {
    // Log the received data for debugging
    console.log("Received vehicle registration data:", req.body);

    // Check if all required fields are present
    if (
      !registrationName ||
      !type ||
      !shortName ||
      !depotName ||
      !initialOdometer ||
      !odometerUnit || // <-- add check
      !loadCapacity ||
      !loadCapacityUnit || // <-- add check
      !driver ||
      !purchase ||
      !vehicleManufacturingDetails
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if a vehicle with the same registrationName already exists
    const existingRegistration = await VehicleRegistration.findOne({
      registrationName,
    });
    if (existingRegistration) {
      return res
        .status(400)
        .json({ error: "Vehicle registration already exists" });
    }

    // Create new vehicle registration
    const newRegistration = await VehicleRegistration.create({
      registrationName,
      type,
      shortName,
      depotName,
      initialOdometer,
      odometerUnit, // <-- added
      loadCapacity,
      loadCapacityUnit, // <-- added
      driver,
      purchase,
      vehicleManufacturingDetails,
    });

    // Mark the driver as assigned
    await DriverType.findOneAndUpdate(
      { name: driver },
      { isAssigned: true },
      { new: true }
    );

    res.status(201).json({
      message: "Vehicle registration added successfully",
      data: newRegistration,
    });
  } catch (error) {
    console.error("Error adding vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ all Vehicle Registrations
router.get("/api/get-vehicle-registration", async (req, res) => {
  try {
    const registrations = await VehicleRegistration.find();
    res.status(200).json({ data: registrations });
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
    res.status(200).json({ data: registration });
  } catch (error) {
    console.error("Error fetching vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE a Vehicle Registration
// UPDATE a Vehicle Registration
router.put("/api/update-vehicle-registration/:id", async (req, res) => {
  const { id } = req.params;
  const {
    registrationName,
    type,
    shortName,
    depotName,
    initialOdometer,
    odometerUnit,
    loadCapacity,
    loadCapacityUnit,
    driver,
    purchase,
    vehicleManufacturingDetails,
  } = req.body;

  try {
    // Check if another registration has the same registrationName
    const existingRegistration = await VehicleRegistration.findOne({
      registrationName,
      _id: { $ne: id },
    });
    if (existingRegistration) {
      return res
        .status(400)
        .json({ error: "Vehicle registration already exists" });
    }

    // Find the existing vehicle registration to check previous driver
    const currentRegistration = await VehicleRegistration.findById(id);
    if (!currentRegistration) {
      return res.status(404).json({ error: "Vehicle registration not found" });
    }

    const previousDriver = currentRegistration.driver;

    // If driver is changed, unassign the old driver and assign the new one
    if (previousDriver !== driver) {
      // Unassign previous driver
      await DriverType.findOneAndUpdate(
        { name: previousDriver },
        { isAssigned: false }
      );

      // Check if new driver is already assigned
      const assignedDriver = await DriverType.findOne({
        name: driver,
        isAssigned: true,
      });
      if (assignedDriver) {
        return res.status(400).json({
          error: `Driver ${driver} is already assigned to another vehicle.`,
        });
      }

      // Assign new driver
      await DriverType.findOneAndUpdate({ name: driver }, { isAssigned: true });
    }

    // Update vehicle registration
    const updatedRegistration = await VehicleRegistration.findByIdAndUpdate(
      id,
      {
        registrationName,
        type,
        shortName,
        depotName,
        initialOdometer,
        odometerUnit, // <-- add
        loadCapacity,
        loadCapacityUnit, // <-- add
        driver,
        purchase,
        vehicleManufacturingDetails,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Vehicle registration updated successfully",
      data: updatedRegistration,
    });
  } catch (error) {
    console.error("Error updating vehicle registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a Vehicle Registration
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
        { name: driver },
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

export default router;
