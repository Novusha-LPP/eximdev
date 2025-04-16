import express from "express";
import ElectricityModel from "../../model/accounts/ElectricityModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-electricity", authenticateJWT, async (req, res) => {
  try {
    const data = await ElectricityModel.find({}).exec();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
