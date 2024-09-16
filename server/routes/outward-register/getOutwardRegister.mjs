import express from "express";
import OutwardRegisterModel from "../../model/outwardRegisterModel.mjs";

const router = express.Router();

router.get("/api/get-outward-registers", async (req, res) => {
  try {
    const outwardRegisterData = await OutwardRegisterModel.find();
    res.status(200).json(outwardRegisterData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
