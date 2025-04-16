import express from "express";
import CommodityCode from "../../../model/srcc/Directory_Management/Commodity.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// Create new commodity
router.post("/api/add-commodity-type", authenticateJWT, async (req, res) => {
  const { name, hsn_code, description } = req.body;

  try {
    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "Name and description are required" });
    }

    // Check uniqueness of name
    const existingName = await CommodityCode.findOne({ name });
    if (existingName) {
      return res
        .status(400)
        .json({ error: "Commodity with this name already exists" });
    }

    const newCommodity = await CommodityCode.create({
      name,
      hsn_code, // optional
      description,
    });

    res.status(201).json({
      message: "Commodity Code added successfully",
      data: newCommodity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all commodities
router.get("/api/get-commodity-type", authenticateJWT, async (req, res) => {
  try {
    const commoditys = await CommodityCode.find();
    res.status(200).json({ data: commoditys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server Error" });
  }
});

// Get commodity by HSN code (optional)
router.get(
  "/api/get-commodity-type/:hsn_code",
  authenticateJWT,
  async (req, res) => {
    const { hsn_code } = req.params;
    try {
      const hsn = await CommodityCode.findOne({ hsn_code });
      if (!hsn) {
        return res.status(404).json({ error: "hsn_code not found" });
      }
      res.status(200).json({ data: hsn });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Update commodity
router.put("/api/update-commodity-type/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, hsn_code } = req.body;

  try {
    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "Name and description are required" });
    }

    // Ensure name is unique (excluding the current item)
    const existingName = await CommodityCode.findOne({
      name,
      _id: { $ne: id },
    });

    if (existingName) {
      return res.status(400).json({
        error: "Commodity name already exists. Use a different name.",
      });
    }

    const updatedCommodity = await CommodityCode.findByIdAndUpdate(
      id,
      { name, description, hsn_code },
      { new: true, runValidators: true }
    );

    if (!updatedCommodity) {
      return res.status(404).json({ error: "Commodity not found" });
    }

    res.status(200).json({
      message: "Commodity updated successfully",
      data: updatedCommodity,
    });
  } catch (error) {
    console.error("Error updating commodity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete commodity
router.delete("/api/delete-commodity-type/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const commodity = await CommodityCode.findByIdAndDelete(id);
    if (!commodity) {
      return res.status(404).json({ error: "Commodity not found" });
    }
    res.status(200).json({
      message: "Commodity deleted successfully",
      data: commodity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
