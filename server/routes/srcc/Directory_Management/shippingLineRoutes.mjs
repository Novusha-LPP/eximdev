import express from "express";
import ShippingLine from "../../../model/srcc/Directory_Management/ShippingLine.mjs";
import Organisation from "../../../model/srcc/Directory_Management/Organisation.mjs";

const router = express.Router();

// Helper function to populate shipping line data
const populateShippingLineData = async (shippingLine) => {
  const shippingLineObj = shippingLine.toObject();

  // Populate organisation
  if (shippingLineObj.organisation) {
    const organisation = await Organisation.findById(
      shippingLineObj.organisation
    );
    if (organisation) {
      shippingLineObj.organisation = {
        _id: organisation._id,
        name: organisation.name,
        alias: organisation.alias,
        type: organisation.type,
      };
    }
  }

  return shippingLineObj;
};

// CREATE: Add new Shipping Line
router.post("/api/add-shipping-line", async (req, res) => {
  try {
    const { name, organisation, code } = req.body;

    if (!organisation) {
      return res.status(400).json({ error: "Organisation ID is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const newLine = await ShippingLine.create({
      name,
      organisation,
      code,
    });

    const populatedLine = await populateShippingLineData(newLine);

    res.status(201).json({
      message: "Shipping line added successfully",
      data: populatedLine,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Shipping line already exists" });
    }
    console.error("Error adding ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL
router.get("/api/get-shipping-line", async (req, res) => {
  try {
    const lines = await ShippingLine.find();
    const populatedLines = await Promise.all(
      lines.map((line) => populateShippingLineData(line))
    );
    res.status(200).json({ data: populatedLines });
  } catch (error) {
    console.error("❌ Error fetching ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE
router.get("/api/get-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const line = await ShippingLine.findById(id);
    if (!line) {
      return res.status(404).json({ error: "Shipping line not found" });
    }

    const populatedLine = await populateShippingLineData(line);
    res.status(200).json({ data: populatedLine });
  } catch (error) {
    console.error("❌ Error fetching ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE
router.put("/api/update-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  const { name, organisation, code } = req.body;

  try {
    if (!organisation) {
      return res.status(400).json({ error: "Organisation ID is required" });
    }

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const updatedLine = await ShippingLine.findByIdAndUpdate(
      id,
      { name, organisation, code },
      { new: true }
    );

    if (!updatedLine) {
      return res.status(404).json({ error: "Shipping line not found" });
    }

    const populatedLine = await populateShippingLineData(updatedLine);
    res.status(200).json({
      message: "Shipping line updated successfully",
      data: populatedLine,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "Shipping line already exists" });
    }
    console.error("❌ Error updating ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE
router.delete("/api/delete-shipping-line/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedLine = await ShippingLine.findByIdAndDelete(id);
    if (!deletedLine) {
      return res.status(404).json({ error: "Shipping line not found" });
    }

    const populatedLine = await populateShippingLineData(deletedLine);
    res.status(200).json({
      message: "Shipping line deleted successfully",
      data: populatedLine,
    });
  } catch (error) {
    console.error("❌ Error deleting ShippingLine:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
