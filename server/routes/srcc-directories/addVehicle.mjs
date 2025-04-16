import express from "express";
import Vehicles from "../../model/srcc/vehicleModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

// POST /api/add-vehicle - Create a new vehicle
router.post("/api/add-vehicle", async (req, res) => {
  const {
    truck_no,
    type_of_vehicle,
    max_tyres,
    units,
    drivers,
    tyres,
    rto,
    challans,
    accidents,
  } = req.body;

  try {
    // Check if the vehicle already exists
    const existingVehicle = await Vehicles.findOne({ truck_no });

    if (existingVehicle) {
      // If the vehicle already exists, respond with a message
      return res.status(400).json({
        success: false,
        message: "Vehicle already exists",
      });
    }

    // Create a new vehicle
    const newVehicle = new Vehicles({
      truck_no,
      type_of_vehicle,
      max_tyres,
      units,
      drivers,
      tyres,
      rto,
      challans,
      accidents,
    });

    // Save the new vehicle to the database
    await newVehicle.save();

    // Respond with a success message
    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      data: newVehicle,
    });
  } catch (err) {
    console.error(err);

    // Respond with an error message if something goes wrong
    res.status(500).json({
      success: false,
      error: "Server Error",
      details: err.message,
    });
  }
});

// Update RTO details for a specific vehicle
router.put("/api/vehicles/:truck_no/rto", async (req, res) => {
  const { truck_no } = req.params;
  const rtoDetails = req.body;

  try {
    const updatedVehicle = await Vehicles.findOneAndUpdate(
      { truck_no: truck_no },
      { rto: rtoDetails },
      { new: true, runValidators: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(updatedVehicle);
  } catch (error) {
    console.error("Error updating RTO details:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/vehicles - Get all vehicles
router.get("/api/get-vehicles",authenticateJWT, async (req, res) => {
  try {
    const vehicles = await Vehicles.find();
    res.status(200).json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// GET /api/vehicle/:truck_no - Get a specific vehicle by truck number
router.get("/api/get-vehicles/:truck_no", authenticateJWT, async (req, res) => {
  try {
    const vehicle = await Vehicles.findOne({ truck_no: req.params.truck_no });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// DELETE /api/vehicle/:truck_no - Delete a specific vehicle
router.delete("/api/delete-vehicle/:truck_no", authenticateJWT, async (req, res) => {
  try {
    const { truck_no } = req.params;
    const result = await Vehicles.findOneAndDelete({ truck_no });
    if (!result) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }
    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// POST /api/vehicle/:truck_no/challan - Add or update a challan for a vehicle
router.post("/api/vehicle/:truck_no/add-challan", async (req, res) => {
  const { truck_no } = req.params;
  const newChallan = req.body;

  try {
    const vehicle = await Vehicles.findOne({ truck_no });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }

    const challanIndex = vehicle.challans.findIndex(
      (challan) => challan.challan_no === newChallan.challan_no
    );

    let message;
    if (challanIndex !== -1) {
      // Update existing challan
      vehicle.challans[challanIndex] = {
        ...vehicle.challans[challanIndex],
        ...newChallan,
      };
      message = "Challan updated successfully";
    } else {
      // Add new challan
      vehicle.challans.push(newChallan);
      message = "Challan added successfully";
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message,
      data:
        challanIndex !== -1
          ? vehicle.challans[challanIndex]
          : vehicle.challans[vehicle.challans.length - 1],
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Server Error", details: err.message });
  }
});

// 1. GET /api/vehicle/:truck_no/challans - Get challans by vehicle number
router.get("/api/vehicle/:truck_no/get-challans", async (req, res) => {
  try {
    const vehicle = await Vehicles.findOne({ truck_no: req.params.truck_no });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }
    res.status(200).json({ success: true, data: vehicle.challans });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// 2. DELETE /api/vehicle/:truck_no/challan/:challan_no - Delete a specific challan for a vehicle
router.delete(
  "/api/vehicle/:truck_no/delete-challan/:challan_no",
  async (req, res) => {
    try {
      const { truck_no, challan_no } = req.params;
      const vehicle = await Vehicles.findOne({ truck_no });

      if (!vehicle) {
        return res
          .status(404)
          .json({ success: false, error: "Vehicle not found" });
      }

      const challanIndex = vehicle.challans.findIndex(
        (challan) => challan.challan_no === challan_no
      );

      if (challanIndex === -1) {
        return res
          .status(404)
          .json({ success: false, error: "Challan not found" });
      }

      vehicle.challans.splice(challanIndex, 1);
      await vehicle.save();

      res.status(200).json({
        success: true,
        message: "Challan deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Server Error" });
    }
  }
);

// 3. POST /api/vehicle/:truck_no/accident - Add or update accident details
router.post("/api/vehicle/:truck_no/add-accident", async (req, res) => {
  const { truck_no } = req.params;
  const newAccident = req.body;

  try {
    const vehicle = await Vehicles.findOne({ truck_no });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }

    const accidentIndex = vehicle.accidents.findIndex(
      (accident) =>
        accident.date === newAccident.date && accident.time === newAccident.time
    );

    let message;
    if (accidentIndex !== -1) {
      // Update existing accident
      vehicle.accidents[accidentIndex] = {
        ...vehicle.accidents[accidentIndex],
        ...newAccident,
      };
      message = "Accident details updated successfully";
    } else {
      // Add new accident
      vehicle.accidents.push(newAccident);
      message = "Accident details added successfully";
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message,
      data:
        accidentIndex !== -1
          ? vehicle.accidents[accidentIndex]
          : vehicle.accidents[vehicle.accidents.length - 1],
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, error: "Server Error", details: err.message });
  }
});

// 4. GET /api/vehicle/:truck_no/accidents - Get accidents by vehicle number
router.get("/api/vehicle/:truck_no/get-accidents", async (req, res) => {
  try {
    const vehicle = await Vehicles.findOne({ truck_no: req.params.truck_no });
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, error: "Vehicle not found" });
    }
    res.status(200).json({ success: true, data: vehicle.accidents });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// 5. DELETE /api/vehicle/:truck_no/accident/:date/:time - Delete a specific accident for a vehicle
router.delete(
  "/api/vehicle/:truck_no/delete-accident/:date/:time",
  async (req, res) => {
    try {
      const { truck_no, date, time } = req.params;
      const vehicle = await Vehicles.findOne({ truck_no });

      if (!vehicle) {
        return res
          .status(404)
          .json({ success: false, error: "Vehicle not found" });
      }

      const accidentIndex = vehicle.accidents.findIndex(
        (accident) => accident.date === date && accident.time === time
      );

      if (accidentIndex === -1) {
        return res
          .status(404)
          .json({ success: false, error: "Accident not found" });
      }

      vehicle.accidents.splice(accidentIndex, 1);
      await vehicle.save();

      res.status(200).json({
        success: true,
        message: "Accident deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Server Error" });
    }
  }
);
export default router;
