import express from "express";
import RentModel from "../../model/accounts/rentModel.mjs";

const router = express.Router();

router.get("/api/get-rent", async (req, res) => {
  try {
    const data = await RentModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
