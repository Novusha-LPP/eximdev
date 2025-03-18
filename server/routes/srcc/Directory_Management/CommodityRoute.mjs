import express from "express";
import CommodityCode from "../../../model/srcc/Directory_Management/Commodity.mjs";

const router = express.Router();

router.post("/api/add-commodity-type", async (req, res) => {
  const { name, hsn_code, description } = req.body;

  try {
    if (!hsn_code) {
      return res.status(400).json({ error: "HSN code is required" });
    }

    // Check if the HSN code already exists
    const existingHSNCode = await CommodityCode.findOne({ hsn_code });
    if (existingHSNCode) {
      return res
        .status(400)
        .json({ error: "Commodity with this HSN code already exists" });
    }

    // Create a new CommodityCode entry
    const newCommodity = await CommodityCode.create({
      name,
      hsn_code,
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

router.get("/api/get-commodity-type", async (req, res) => {
  try {
    const commoditys = await CommodityCode.find();
    res.status(200).json({ data: commoditys });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server Error" });
  }
});

router.get("/api/get-commodity-type/:hsn_code", async (req, res) => {
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
});

router.put("/api/update-commodity-type/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, hsn_code } = req.body;

  try {
    // Ensure HSN code is provided
    if (!hsn_code) {
      return res.status(400).json({ error: "HSN code is required" });
    }

    // Check if the HSN code already exists in another record
    const existingHSNCode = await CommodityCode.findOne({
      hsn_code,
      _id: { $ne: id },
    });

    if (existingHSNCode) {
      return res
        .status(400)
        .json({ error: "HSN code already exists. Choose a different one." });
    }

    // Update the commodity
    const updatedCommodity = await CommodityCode.findByIdAndUpdate(
      id,
      { name, description, hsn_code },
      { new: true }
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

// Delete a commodity using MongoDB _id
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
