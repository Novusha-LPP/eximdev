import express from "express";
import TyreBrand from "../../model/srcc/tyreBrand.mjs";

const router = express.Router();

router.post("/api/add-tyre-brand", async (req, res) => {
  const { tyre_brand, make, description } = req.body;
  console.log(req.body);

  const existingTyreBrand = await TyreBrand.findOne({ tyre_brand });
  if (existingTyreBrand) {
    res.status(200).json({ message: "Tyre brand already exists" });
  } else {
    const newTyreBrand = new TyreBrand({
      tyre_brand,
      make,
      description,
      _date: new Date().toLocaleDateString("en-GB"),
    });
    await newTyreBrand.save();
    res.status(200).json({ message: "Tyre brand added successfully" });
  }
});

export default router;
