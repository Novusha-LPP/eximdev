import express from "express";
import AdvanceToDriver from "../../../model/srcc/Directory_Management/AdvanceToDriver.mjs";
import VehicleType from "../../../model/srcc/Directory_Management/VehicleType.mjs";

const router = express.Router();

// Helper function to populate advance to driver data
const populateAdvanceToDriverData = async (advanceData) => {
  const advanceObj = advanceData.toObject();

  // Populate vehicleType
  if (advanceObj.vehicleType) {
    const vehicleType = await VehicleType.findById(advanceObj.vehicleType);
    if (vehicleType) {
      advanceObj.vehicleType = {
        _id: vehicleType._id,
        vehicleType: vehicleType.vehicleType,
        shortName: vehicleType.shortName,
      };
    }
  }

  return advanceObj;
};

// CREATE: Add new "Advance to Driver"
router.post("/api/add-advance-to-driver", async (req, res) => {
  try {
    const advanceItem = await AdvanceToDriver.create(req.body);
    const populatedAdvanceItem = await populateAdvanceToDriverData(advanceItem);
    res.status(201).json({
      message: "Advance to Driver added successfully",
      data: populatedAdvanceItem,
    });
  } catch (error) {
    console.error("❌ Error adding AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL
router.get("/api/get-advance-to-driver", async (req, res) => {
  try {
    const dataList = await AdvanceToDriver.find();
    const populatedDataList = await Promise.all(
      dataList.map((advanceData) => populateAdvanceToDriverData(advanceData))
    );
    res.status(200).json({ data: populatedDataList });
  } catch (error) {
    console.error("❌ Error fetching AdvanceToDriver list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE
router.get("/api/get-advance-to-driver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const dataItem = await AdvanceToDriver.findById(id);
    if (!dataItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }
    const populatedDataItem = await populateAdvanceToDriverData(dataItem);
    res.status(200).json({ data: populatedDataItem });
  } catch (error) {
    console.error("❌ Error fetching AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE
router.put("/api/update-advance-to-driver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const updatedItem = await AdvanceToDriver.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }

    const populatedUpdatedItem = await populateAdvanceToDriverData(updatedItem);

    res.status(200).json({
      message: "Advance to Driver updated successfully",
      data: populatedUpdatedItem,
    });
  } catch (error) {
    console.error("❌ Error updating AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE
router.delete("/api/delete-advance-to-driver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await AdvanceToDriver.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ error: "AdvanceToDriver not found" });
    }
    res.status(200).json({
      message: "Advance to Driver deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("❌ Error deleting AdvanceToDriver:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
