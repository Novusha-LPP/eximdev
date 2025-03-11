import express from "express";
import DriverType from "../../../model/srcc/Directory_Management/Driver.mjs";

const router = express.Router();

// License Number Validation (2 letters, 13 digits)
const validateLicenseNumber = (licenseNumber) =>
  /^[A-Za-z]{2}\d{13}$/.test(licenseNumber);

// Phone Number Validation (10 digits)
const validatePhoneNumber = (phoneNumber) => /^\d{10}$/.test(phoneNumber);

// Expiry Date Validation (must be a valid date)
const validateExpiryDate = (expiryDate) => !isNaN(new Date(expiryDate));

// Function to validate driver data
const validateDriverData = (data) => {
  const errors = [];

  if (!validateLicenseNumber(data.licenseNumber)) {
    errors.push("Invalid License Number.");
  }
  if (!validatePhoneNumber(data.phoneNumber)) {
    errors.push("Phone Number must be 10 digits.");
  }
  // if (!validatePhoneNumber(data.alternateNumber)) {
  //   errors.push("Alternate Phone Number must be 10 digits.");
  // }
  if (!validateExpiryDate(data.licenseExpiryDate)) {
    errors.push("Invalid License Expiry Date.");
  }

  return errors;
};

// POST route to create a new driver
router.post("/api/create-driver", async (req, res) => {
  const validationErrors = validateDriverData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(", ") });
  }

  // Check if the licenseNumber already exists
  const existingDriver = await DriverType.findOne({
    licenseNumber: req.body.licenseNumber,
  });
  if (existingDriver) {
    return res
      .status(400)
      .json({ message: "Driver with this license number already exists." });
  }

  try {
    const newDriver = new DriverType(req.body);
    await newDriver.save();
    return res.status(201).json(newDriver);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error creating driver", error: error.message });
  }
});
// GET route to retrieve all drivers
router.get("/api/all-drivers", async (req, res) => {
  try {
    const drivers = await DriverType.find();
    return res.status(200).json(drivers);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error fetching drivers", error: error.message });
  }
});

// GET route to retrieve a driver by ID
router.get("/api/get-driver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const driver = await DriverType.findById(id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    return res.status(200).json(driver);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error fetching driver", error: error.message });
  }
});

// PUT route to update a driver by ID
router.put("/api/update-driver/:id", async (req, res) => {
  const { id } = req.params;
  const validationErrors = validateDriverData(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({ message: validationErrors.join(", ") });
  }

  // Check if the licenseNumber already exists for another driver (excluding current driver)
  const existingDriver = await DriverType.findOne({
    licenseNumber: req.body.licenseNumber,
    _id: { $ne: id },
  });
  if (existingDriver) {
    return res
      .status(400)
      .json({ message: "Driver with this license number already exists." });
  }

  try {
    const updatedDriver = await DriverType.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    return res.status(200).json(updatedDriver);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error updating driver", error: error.message });
  }
});

// DELETE route to delete a driver by ID
router.delete("/api/delete-driver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedDriver = await DriverType.findByIdAndDelete(id);
    if (!deletedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    return res.status(200).json({ message: "Driver deleted successfully" });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error deleting driver", error: error.message });
  }
});

// New GET route to retrieve drivers by typerouter.get("/api/drivers-by-type/:type", async (req, res) => {
router.get("/api/available-drivers/:type", async (req, res) => {
  const { type } = req.params;

  if (!type) {
    return res.status(400).json({ message: "Type parameter is required" });
  }

  try {
    // Log the type received for debugging
    console.log("Received type:", type);

    // Use regex to match the drivingVehicleTypes field for the selected type
    const drivers = await DriverType.find({
      drivingVehicleTypes: { $regex: type, $options: "i" }, // Case-insensitive regex match
      isAssigned: false, // Ensure driver is not assigned
    });

    // Log available drivers for debugging
  
    if (drivers.length === 0) {
      return res
        .status(404)
        .json({ message: `No available drivers for type: ${type}` });
    }

    return res.status(200).json(drivers);
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching available drivers",
      error: error.message,
    });
  }
});

export default router;
