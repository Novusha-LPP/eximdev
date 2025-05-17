import express from "express";
import MobileModel from "../../model/accounts/mobileModel.mjs";

const router = express.Router();

router.get("/api/get-mobile", async (req, res) => {
  try {
    const data = await MobileModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
