import express from "express";
import TyreTypes from "../../model/srcc/tyreTypes.mjs";

const router = express.Router();

router.post("/api/add-tyre-type", async (req, res) => {
  const { tyre_type } = req.body;
  console.log(req.body);
  try {
    const existingTyreType = await TyreTypes.findOne({ tyre_type });
    if (existingTyreType) {
      res.status(200).json({ message: "Tyre type already exists" });
    } else {
      const newVehicle = new TyreTypes({
        tyre_type,
        _date: new Date().toLocaleDateString("en-GB"),
      });
      await newVehicle.save();
      res.status(200).json({ message: "Tyre type added successfully" });
    }
  } catch (err) {
    console.log(err);
  }
});

export default router;
