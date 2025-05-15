import express from "express";
import PlyRatings from "../../model/srcc/plyRatings.mjs";
import { authenticateJWT } from "../../auth/auth.mjs";

const router = express.Router();

router.get("/api/get-ply-ratings", authenticateJWT, async (req, res) => {
  const existingPlyRating = await PlyRatings.find({});
  if (existingPlyRating) {
    res.status(200).json(existingPlyRating);
  } else {
    res.status(200).json({ message: "No ply rating found" });
  }
});

export default router;
