import express from "express";
import RepairType from "../../model/srcc/repairTypes.mjs";

const router = express.Router();

router.post("/api/add-repair-type", async (req, res) => {
  const { repair_type } = req.body;
  console.log(req.body);

  const existingRepairType = await RepairType.findOne({ repair_type });
  if (existingRepairType) {
    res.status(200).json({ message: "Repair type already exists" });
  } else {
    const newRepairType = new RepairType({
      repair_type,
      _date: new Date().toLocaleDateString("en-GB"),
    });
    await newRepairType.save();
    res.status(200).json({ message: "Repair type added successfully" });
  }
});

export default router;
