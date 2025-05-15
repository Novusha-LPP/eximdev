import express from "express";
import Tyre from "../../model/srcc/tyreModel.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";
const router = express.Router();

router.get("/api/tyre-details/:tyreNo", authenticateJWT, async (req, res) => {
  const { tyreNo } = req.params;
  const existingTyre = await Tyre.findOne({ tyre_no: tyreNo });

  if (existingTyre) {
    res.status(200).json(existingTyre);
  } else {
    res.status(200).json({ message: "Tyre does not exist" });
  }
});

export default router;
