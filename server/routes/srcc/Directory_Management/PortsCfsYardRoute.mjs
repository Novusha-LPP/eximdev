import express from "express";
import PortICDcode from "../../../model/srcc/Directory_Management/PortsCfsYard.mjs";

const router = express.Router();

// CREATE a new PortCFSYard
router.post("/api/add-port-type", async (req, res) => {
  const {
    organisation, // expects { _id, name }
    name,
    icd_code,
    state,
    country,
    active,
    type,
    contactPersonName,
    contactPersonEmail,
    contactPersonPhone,
  } = req.body;

  try {
    if (!icd_code) {
      return res.status(400).json({ error: "ICD code is required" });
    }

    if (!organisation || !organisation._id || !organisation.name) {
      return res
        .status(400)
        .json({ error: "Organisation (_id and name) is required" });
    }

    const existingICDCode = await PortICDcode.findOne({ icd_code });
    if (existingICDCode) {
      return res
        .status(400)
        .json({ error: "Ports/CFS/Yard with this ICD code already exists" });
    }

    const newICDCode = await PortICDcode.create({
      organisation,
      name,
      icd_code,
      state,
      country,
      active,
      type,
      contactPersonName,
      contactPersonEmail,
      contactPersonPhone,
    });

    res.status(201).json({
      message: "ICD Ports/CFS/Yard added successfully",
      data: newICDCode,
    });
  } catch (error) {
    console.error("Error adding Port Type:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// READ all
router.get("/api/get-port-types", async (req, res) => {
  try {
    const ports = await PortICDcode.find();
    res.status(200).json({ data: ports });
  } catch (error) {
    console.error("Error fetching Ports:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// READ one by ICD code
router.get("/api/get-port-type/:icd_code", async (req, res) => {
  const { icd_code } = req.params;

  try {
    const port = await PortICDcode.findOne({ icd_code });

    if (!port) {
      return res.status(404).json({ error: "Port/CFS/Yard not found" });
    }

    res.status(200).json({ data: port });
  } catch (error) {
    console.error("Error fetching Port:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE by ICD code
router.put("/api/update-port-type/:icd_code", async (req, res) => {
  const { icd_code } = req.params;
  const {
    organisation,
    name,
    state,
    country,
    active,
    type,
    contactPersonName,
    contactPersonEmail,
    contactPersonPhone,
  } = req.body;

  try {
    if (!organisation || !organisation._id || !organisation.name) {
      return res
        .status(400)
        .json({ error: "Organisation (_id and name) is required" });
    }

    const updatedPort = await PortICDcode.findOneAndUpdate(
      { icd_code },
      {
        organisation,
        name,
        state,
        country,
        active,
        type,
        contactPersonName,
        contactPersonEmail,
        contactPersonPhone,
      },
      { new: true }
    );

    if (!updatedPort) {
      return res.status(404).json({ error: "Port/CFS/Yard not found" });
    }

    res.status(200).json({
      message: "ICD Ports/CFS/Yard updated successfully",
      data: updatedPort,
    });
  } catch (error) {
    console.error("Error updating Port:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE by ICD code
router.delete("/api/delete-port-type/:icd_code", async (req, res) => {
  const { icd_code } = req.params;

  try {
    const deletedPort = await PortICDcode.findOneAndDelete({ icd_code });

    if (!deletedPort) {
      return res.status(404).json({ error: "Port/CFS/Yard not found" });
    }

    res.status(200).json({
      message: "ICD Ports/CFS/Yard deleted successfully",
      data: deletedPort,
    });
  } catch (error) {
    console.error("Error deleting Port:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
