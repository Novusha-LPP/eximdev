import express from "express";
import Organisation from "../../../model/srcc/Directory_Management/Organisation.mjs";
import { authenticateJWT } from "../../../auth/auth.mjs";

const router = express.Router();

// ------------------ AUTOCOMPLETE (GET) ------------------
router.get("/api/organisations/autocomplete",authenticateJWT, async (req, res) => {
  try {
    const q = req.query.q || "";

    const organisations = await Organisation.find(
      { name: { $regex: q, $options: "i" } },
      { name: 1 } // Only return name field
    )
      .limit(10)
      .lean();

    if (!organisations.length) {
      return res.status(404).json({ error: "Organisation not found" });
    }

    res.status(200).json({ data: organisations });
  } catch (error) {
    console.error("Error fetching organisations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ CREATE (POST) ------------------
router.post("/api/organisations",authenticateJWT, async (req, res) => {
  try {
    // Check if an organisation with the same name already exists
    const existingOrg = await Organisation.findOne({ name: req.body.name });
    if (existingOrg) {
      return res.status(400).json({
        error: "Organisation with this name already exists.",
      });
    }

    // Create a new organisation
    const newOrg = await Organisation.create(req.body);
    res.status(201).json({
      message: "Organisation added successfully",
      data: newOrg,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error (fallback)
      return res.status(400).json({
        error: "Organisation with this name already exists.",
      });
    }
    console.error("Error creating Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ READ ALL (GET) ------------------
router.get("/api/organisations",authenticateJWT, async (req, res) => {
  try {
    const orgs = await Organisation.find();
    res.status(200).json({ data: orgs });
  } catch (error) {
    console.error("Error fetching Organisations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET /api/organisations/names
router.get("/api/organisations/names",authenticateJWT, async (req, res) => {
  try {
    // 1) Query your Organisation collection to retrieve only the "name" field.
    //    Mongoose will return an array of docs with just "_id" and "name".
    const orgs = await Organisation.find({}, "name");

    // 2) Map the docs to an array of just the name strings.
    const nameList = orgs.map((org) => org.name);

    // 3) Send back the array of names as JSON
    res.status(200).json(nameList);
  } catch (error) {
    console.error("Error fetching organisation names:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ READ ONE (GET) ------------------
router.get("/api/organisations/:id",authenticateJWT, async (req, res) => {
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

// ------------------ UPDATE (PUT) ------------------
router.put("/api/organisations/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the new name already exists (excluding the current organisation)
    if (req.body.name) {
      const existingOrg = await Organisation.findOne({
        name: req.body.name,
        _id: { $ne: id }, // Exclude the current organisation
      });
      if (existingOrg) {
        return res.status(400).json({
          error: "Organisation with this name already exists.",
        });
      }
    }

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
    if (error.code === 11000) {
      // Duplicate key error
      return res.status(400).json({
        error: "Organisation with this name already exists.",
      });
    }
    console.error("Error updating Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ DELETE (DELETE) ------------------
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
