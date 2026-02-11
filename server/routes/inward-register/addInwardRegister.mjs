import express from "express";
import InwardRegisterModel from "../../model/inwardRegisterModel.mjs";

const router = express.Router();

router.post("/api/add-inward-register", async (req, res) => {
  try {
    const {
      time,
      date,
      from,
      type,
      details_of_document,
      contact_person_name,
      inward_consignment_photo,
    } = req.body;

    await InwardRegisterModel.create({
      time,
      date,
      from,
      type,
      details_of_document,
      contact_person_name,
      inward_consignment_photo,
    });

    res.status(201).json({ message: "Inward register added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
