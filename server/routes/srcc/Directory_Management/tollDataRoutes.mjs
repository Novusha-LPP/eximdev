import express from "express";
import TollData from "../../../model/srcc/Directory_Management/TollData.mjs";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";

const router = express.Router();

// Helper function to populate toll data references
const populateTollData = async (tollData) => {
  const tollDataObj = tollData.toObject();

  // Populate vehicleType array
  if (tollDataObj.vehicleType?.length > 0) {
    const vehicleTypes = await VehicleType.find({
      _id: { $in: tollDataObj.vehicleType },
    });
    tollDataObj.vehicleType = vehicleTypes.map((vehicleType) => ({
      _id: vehicleType._id,
      vehicleType: vehicleType.vehicleType,
      shortName: vehicleType.shortName,
    }));
  }

  // Populate secondPassTollBooth
  if (tollDataObj.secondPassTollBooth) {
    const secondPassToll = await TollData.findById(
      tollDataObj.secondPassTollBooth
    );
    if (secondPassToll) {
      tollDataObj.secondPassTollBooth = {
        _id: secondPassToll._id,
        tollBoothName: secondPassToll.tollBoothName,
        fastagClassId: secondPassToll.fastagClassId,
      };
    }
  }

  return tollDataObj;
};

// CREATE: Add new Toll Data
router.post("/api/add-toll-data", async (req, res) => {
  const {
    tollBoothName,
    vehicleType,
    fastagClassId,
    singleAmount,
    returnAmount,
    secondPassTollBooth,
  } = req.body;

  try {
    // Optional: check if toll data already exists for the same booth/vehicleType
    // If you want a uniqueness rule, do that here.

    const newTollData = await TollData.create({
      tollBoothName,
      vehicleType,
      fastagClassId,
      singleAmount,
      returnAmount,
      secondPassTollBooth: secondPassTollBooth || null,
    });

    const populatedTollData = await populateTollData(newTollData);

    res.status(201).json({
      message: "Toll data added successfully",
      data: populatedTollData,
    });
  } catch (error) {
    console.error("❌ Error adding Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL: Get all Toll Data
router.get("/api/get-toll-data", async (req, res) => {
  try {
    const tollDataList = await TollData.find();
    const populatedTollDataList = await Promise.all(
      tollDataList.map((tollData) => populateTollData(tollData))
    );
    res.status(200).json({ data: populatedTollDataList });
  } catch (error) {
    console.error("❌ Error fetching Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE: Get Toll Data by ID
router.get("/api/get-toll-data/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const tollDataItem = await TollData.findById(id);
    if (!tollDataItem) {
      return res.status(404).json({ error: "Toll data not found" });
    }
    const populatedTollData = await populateTollData(tollDataItem);
    res.status(200).json({ data: populatedTollData });
  } catch (error) {
    console.error("❌ Error fetching Toll Data by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE: Update Toll Data
router.put("/api/update-toll-data/:id", async (req, res) => {
  const { id } = req.params;
  const {
    tollBoothName,
    vehicleType,
    fastagClassId,
    singleAmount,
    returnAmount,
    secondPassTollBooth,
  } = req.body;

  try {
    // Optional uniqueness checks

    const updatedTollData = await TollData.findByIdAndUpdate(
      id,
      {
        tollBoothName,
        vehicleType,
        fastagClassId,
        singleAmount,
        returnAmount,
        secondPassTollBooth: secondPassTollBooth || null,
      },
      { new: true }
    );

    if (!updatedTollData) {
      return res.status(404).json({ error: "Toll data not found" });
    }

    const populatedTollData = await populateTollData(updatedTollData);

    res.status(200).json({
      message: "Toll data updated successfully",
      data: populatedTollData,
    });
  } catch (error) {
    console.error("❌ Error updating Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE: Delete Toll Data
router.delete("/api/delete-toll-data/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedTollData = await TollData.findByIdAndDelete(id);
    if (!deletedTollData) {
      return res.status(404).json({ error: "Toll data not found" });
    }
    res.status(200).json({
      message: "Toll data deleted successfully",
      data: deletedTollData,
    });
  } catch (error) {
    console.error("❌ Error deleting Toll Data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
