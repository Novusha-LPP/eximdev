import express from "express";
import StateDistrict from "../../../model/srcc/Directory_Management/StateDistrict.mjs"; // Ensure correct path

const router = express.Router();

/**
 * @route POST /api/add-state-district
 * @desc Create a new state with districts
 */
router.post("/api/add-state-district", async (req, res) => {
  try {
    const { states } = req.body;

    if (!Array.isArray(states) || states.length === 0) {
      return res.status(400).json({ error: "Invalid states data format" });
    }

    const existingData = await StateDistrict.findOne();
    if (existingData) {
      existingData.states.push(...states);
      await existingData.save();
      return res.status(201).json({
        message: "States added successfully",
        data: existingData,
      });
    }

    const newEntry = await StateDistrict.create({ states });
    res
      .status(201)
      .json({ message: "States added successfully", data: newEntry });
  } catch (error) {
    console.error("Error adding states:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route GET /api/get-state-districts
 * @desc Retrieve all states and districts
 */
router.get("/api/get-state-districts", async (req, res) => {
  try {
    const data = await StateDistrict.findOne();
    if (!data) {
      return res.status(404).json({ error: "No state data found" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route PUT /api/update-state-district/:state
 * @desc Update an existing state's districts
 */
router.put("/api/update-state-district/:state", async (req, res) => {
  try {
    const { state } = req.params;
    const { districts } = req.body;

    const stateData = await StateDistrict.findOne();
    if (!stateData) {
      return res.status(404).json({ error: "No state data found" });
    }

    const stateIndex = stateData.states.findIndex((s) => s.state === state);
    if (stateIndex === -1) {
      return res.status(404).json({ error: "State not found" });
    }

    stateData.states[stateIndex].districts = districts;
    await stateData.save();

    res.status(200).json({
      message: "State districts updated successfully",
      data: stateData.states[stateIndex],
    });
  } catch (error) {
    console.error("Error updating state districts:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @route DELETE /api/delete-state/:state
 * @desc Delete a state and its districts
 */
router.delete("/api/delete-state/:state", async (req, res) => {
  try {
    const { state } = req.params;

    const stateData = await StateDistrict.findOne();
    if (!stateData) {
      return res.status(404).json({ error: "No state data found" });
    }

    stateData.states = stateData.states.filter((s) => s.state !== state);
    await stateData.save();

    res.status(200).json({ message: "State deleted successfully" });
  } catch (error) {
    console.error("Error deleting state:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
