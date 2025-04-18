import express from "express";
import Organisation from "../../../model/srcc/Directory_Management/Organisation.mjs";

const router = express.Router();

// ------------------ AUTOCOMPLETE (GET) ------------------
router.get("/api/organisations/autocomplete", async (req, res) => {
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
router.post("/api/organisations", async (req, res) => {
  try {
    const newOrg = await Organisation.create(req.body);
    res.status(201).json({
      message: "Organisation added successfully",
      data: newOrg,
    });
  } catch (error) {
    console.error("Error creating Organisation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------ READ ALL (GET) ------------------
router.get("/api/organisations", async (req, res) => {
  try {
    const orgs = await Organisation.find();
    res.status(200).json({ data: orgs });
  } catch (error) {
    console.error("Error fetching Organisations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET /api/organisations/names
router.get("/api/organisations/names", async (req, res) => {
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

// ------------------ UPDATE (PUT) ------------------
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
