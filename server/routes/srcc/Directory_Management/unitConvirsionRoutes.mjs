import express from "express";
import Conversion from "../../../model/srcc/Directory_Management/unitConversion.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// POST: Add a new unit conversion

// **GET: Fetch all unit conversions**
router.get("/api/get-unit-conversions", authenticateJWT, async (req, res) => {
  try {
    const conversions = await Conversion.find();
    res.json(conversions);
  } catch (error) {
    res.status(500).json({ error: "Error fetching unit conversions" });
  }
});

// **POST: Add a new unit conversion**
router.post("/api/add-unit-conversion", authenticateJWT, async (req, res) => {
  try {
    const { uqc, uqc_desc, type } = req.body;
    const newConversion = new Conversion({ uqc, uqc_desc, type });
    await newConversion.save();
    res.json({
      message: "Unit conversion added successfully!",
      data: newConversion,
    });
  } catch (error) {
    res.status(500).json({ error: "Error adding unit conversion" });
  }
});

// **PUT: Update a unit conversion**
router.put("/api/update-unit-conversion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedConversion = await Conversion.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedConversion) {
      return res.status(404).json({ error: "Conversion not found" });
    }

    res.json({
      message: "Unit conversion updated successfully!",
      data: updatedConversion,
    });
  } catch (error) {
    res.status(500).json({ error: "Error updating unit conversion" });
  }
});

// **DELETE: Remove a unit conversion**
router.delete("/api/delete-unit-conversion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedConversion = await Conversion.findByIdAndDelete(id);

    if (!deletedConversion) {
      return res.status(404).json({ error: "Conversion not found" });
    }

    res.json({ message: "Unit conversion deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting unit conversion" });
  }
});

export default router;
