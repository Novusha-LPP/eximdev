import express from "express";
import Organisation from "../../../model/srcc/Directory_Management/Organisation.mjs"; // Adjust path as needed

const router = express.Router();

// CREATE
router.post("/api/organisations", async (req, res) => {
  try {
    const newOrg = await Organisation.create(req.body);
    res
      .status(201)
      .json({ message: "Organisation added successfully", data: newOrg });
  } catch (error) {
    console.error("Error creating Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ALL
router.get("/api/organisations", async (req, res) => {
  try {
    const orgs = await Organisation.find();
    res.status(200).json({ data: orgs });
  } catch (error) {
    console.error("Error fetching Organisations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// READ ONE
router.get("/api/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organisation.findById(id);
    if (!org) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    res.status(200).json({ data: org });
  } catch (error) {
    console.error("Error fetching Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE
router.put("/api/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrg = await Organisation.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedOrg) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    res.status(200).json({
      message: "Organisation updated successfully",
      data: updatedOrg,
    });
  } catch (error) {
    console.error("Error updating Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE
router.delete("/api/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrg = await Organisation.findByIdAndDelete(id);
    if (!deletedOrg) {
      return res.status(404).json({ error: "Organisation not found" });
    }
    res.status(200).json({
      message: "Organisation deleted successfully",
      data: deletedOrg,
    });
  } catch (error) {
    console.error("Error deleting Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
