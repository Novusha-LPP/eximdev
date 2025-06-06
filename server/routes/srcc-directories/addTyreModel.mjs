import express from "express";
import TyreModels from "../../model/srcc/tyreModels.mjs";

const router = express.Router();

router.post("/api/add-tyre-model", async (req, res) => {
  const { tyre_brand, tyre_model, description } = req.body;
  console.log(req.body);

  const existingTyreModel = await TyreModels.findOne({ tyre_model });
  if (existingTyreModel) {
    res.status(200).json({ message: "Tyre model already exists" });
  } else {
    const newTyreModel = new TyreModels({
      tyre_model,
      tyre_brand,
      description,
      _date: new Date().toLocaleDateString("en-GB"),
    });
    await newTyreModel.save();
    res.status(200).json({ message: "Tyre model added successfully" });
  }
});

export default router;
