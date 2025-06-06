import express from "express";
import TyreModels from "../../model/srcc/tyreModels.mjs";

const router = express.Router();

router.get("/api/get-tyre-models", async (req, res) => {
  const existingTyreModel = await TyreModels.find({});
  if (existingTyreModel) {
    res.status(200).json(existingTyreModel);
  } else {
    res.status(200).json({ message: "No tyre model found" });
  }
});

export default router;
