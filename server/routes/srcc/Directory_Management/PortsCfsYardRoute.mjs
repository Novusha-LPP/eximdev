import express from "express";
import PortICDcode from "../../../model/srcc/Directory_Management/PortsCfsYard.mjs";

const router = express.Router();

// CREATE a new PortCFSYard
router.post("/api/add-port-type", async (req, res) => {
  const {
    organization,
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

    // Check if the ICD code already exists
    const existingICDCode = await PortICDcode.findOne({ icd_code });
    if (existingICDCode) {
      return res
        .status(400)
        .json({ error: "Ports/CFS/Yard with this ICD code already exists" });
    }

    // Create a new PortICDcode entry
    const newICDCode = await PortICDcode.create({
      organization,
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
    console.error(error); // For debugging purposes
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// READ all PortCFSYard entries
router.get("/api/get-port-types", async (req, res) => {
  try {
    const ports = await PortICDcode.find();
    res.status(200).json({ data: ports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// READ a single PortCFSYard entry by icd_code
router.get("/api/get-port-type/:icd_code", async (req, res) => {
  const { icd_code } = req.params;

  try {
    const port = await PortICDcode.findOne({ icd_code });

    if (!port) {
      return res.status(404).json({ error: "Port/CFS/Yard not found" });
    }

    res.status(200).json({ data: port });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// UPDATE an existing PortCFSYard entry by icd_code
router.put("/api/update-port-type/:icd_code", async (req, res) => {
  const { icd_code } = req.params;
  const {
    organization,
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
    const updatedPort = await PortICDcode.findOneAndUpdate(
      { icd_code },
      {
        organization,
        name,
        state,
        country,
        active,
        type,
        contactPersonName,
        contactPersonEmail,
        contactPersonPhone,
      },
      { new: true } // Return the updated document
    );

    if (!updatedPort) {
      return res.status(404).json({ error: "Port/CFS/Yard not found" });
    }

    res.status(200).json({
      message: "ICD Ports/CFS/Yard updated successfully",
      data: updatedPort,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE a PortCFSYard entry by icd_code
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
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
