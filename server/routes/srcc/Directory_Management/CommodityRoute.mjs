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

router.put("/api/update-commodity-type/:hsn_code", async (req, res) => {
  const { hsn_code } = req.params;
  const { name, description } = req.body;

  try {
    const updatedHsn = await CommodityCode.findOneAndUpdate(
      { hsn_code },
      { name, description },
      { new: true }
    );

    if (!updatedHsn) {
      return res.status(404).json({ error: "HSN code not found" });
    }

    res.status(200).json({
      message: "HSN code updated successfully",
      data: updatedHsn, // ✅ FIXED: Returning correct data
    });
  } catch (error) {
    console.error("❌ Error updating commodity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/delete-commodity-type/:hsn_code", async (req, res) => {
  const { hsn_code } = req.params;
  try {
    const deleteHSN = await CommodityCode.findOneAndDelete({ hsn_code });
    if (!deleteHSN) {
      return res.status(404).json({ error: "HSN code not found" });
    }
    res.status(200).json({
      message: "HNS code deleted successfully",
      data: deleteHSN,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server Error" });
  }
});
export default router;
