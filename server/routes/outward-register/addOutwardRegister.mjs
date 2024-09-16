import express from "express";
import OutwardRegisterModel from "../../model/outwardRegisterModel.mjs";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.post("/api/add-outward-register", async (req, res) => {
  try {
    const {
      bill_given_date,
      party,
      division,
      party_email,
      description,
      kind_attention,
    } = req.body;

    await OutwardRegisterModel.create({
      bill_given_date,
      party,
      division,
      party_email,
      description,
      kind_attention,
    });

    res.status(201).json({
      message: "Outward register added successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
