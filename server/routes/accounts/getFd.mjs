import express from "express";
import FdModel from "../../model/accounts/fdModel.mjs";

const router = express.Router();

router.get("/api/get-fd", async (req, res) => {
  try {
    const data = await FdModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
