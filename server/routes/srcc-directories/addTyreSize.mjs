import express from "express";
import TyreSize from "../../model/srcc/tyreSizes.mjs";
const router = express.Router();

router.post("/api/add-tyre-size", async (req, res) => {
  const { tyre_size } = req.body;
  console.log(req.body);

  const existingTyreSize = await TyreSize.findOne({ tyre_size });
  if (existingTyreSize) {
    res.status(200).json({ message: "Tyre size already exists" });
  } else {
    const newTyreSize = new TyreSize({
      tyre_size,
      _date: new Date().toLocaleDateString("en-GB"),
    });
    await newTyreSize.save();
    res.status(200).json({ message: "Tyre size added successfully" });
  }
});

export default router;
