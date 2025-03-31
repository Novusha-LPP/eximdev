import express from "express";
import VehicleRegistration from "../../../model/srcc/Directory_Management/VehicleRegistration.mjs";
import DriverType from "../../../model/srcc/Directory_Management/Driver.mjs";

const router = express.Router();

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
    // Log the received data for debugging
    console.log("Received vehicle registration data:", req.body);

    // Check if vehicle number is valid
    if (!vehicleNumber || !isValidVehicleNumber(vehicleNumber)) {
      return res.status(400).json({
        error: "Invalid vehicle number format. Should be like MH12XX1234.",
      });
    }

    // Check if all required fields are present
    if (
      !registrationName ||
      !type ||
      !shortName ||
      !depotName ||
      !initialOdometer ||
      !initialOdometer.value ||
      !initialOdometer.unit ||
      !loadCapacity ||
      !loadCapacity.value ||
      !loadCapacity.unit ||
      !driver ||
      !driver._id ||
      !driver.name ||
      !driver.phoneNumber ||
      !vehicleManufacturingDetails
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if a vehicle with the same registrationName or vehicleNumber already exists
    const existingRegistration = await VehicleRegistration.findOne({
      $or: [{ registrationName }, { vehicleNumber }],
    });

    if (existingRegistration) {
      return res
        .status(400)
        .json({
          error: "Vehicle registration or vehicle number already exists",
        });
    }

    // Create new vehicle registration
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

    // Mark the driver as assigned
    await DriverType.findOneAndUpdate(
      { _id: driver._id },
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
      return res
        .status(400)
        .json({
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
    }

    // Update vehicle registration
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

export default router;
