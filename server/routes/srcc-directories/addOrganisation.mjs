import express from "express";
import CustomerKycModel from "../../model/customerKycModel.mjs";

const router = express.Router();

router.post("/api/add-srcc-organisation", async (req, res) => {
  try {
    const { pan_no, ...rest } = req.body;

    // Find the document with the matching pan_no
    const organisation = await CustomerKycModel.findOne({ pan_no });

    if (organisation) {
      return res.status(200).json({ message: "Organisation already exists" });
    }

    // Add the additional field 'module'
    const newOrganisation = new CustomerKycModel({
      ...rest,
      pan_no,
      module: "Transportation",
    });

    await newOrganisation.save();
    res.status(201).json({ message: "Organisation created successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
