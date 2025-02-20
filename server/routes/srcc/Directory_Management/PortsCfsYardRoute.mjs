import express from "express";
import PortICDcode from "../../../model/srcc/Directory_Management/PortsCfsYard.mjs";

const router = express.Router();

router.post("/api/add-port-type", async (req, res) => {
  const {
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

export default router;
