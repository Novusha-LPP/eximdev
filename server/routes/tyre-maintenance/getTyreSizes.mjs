import express from "express";
import TyreSize from "../../model/srcc/tyreSizes.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-tyre-sizes", authenticateJWT, async (req, res) => {
  const existingTyreSize = await TyreSize.find({});
  if (existingTyreSize) {
    res.status(200).json(existingTyreSize);
  } else {
    res.status(200).json({ message: "No tyre size found" });
  }
});

export default router;
