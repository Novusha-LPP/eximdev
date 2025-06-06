import express from "express";
import TyreModel from "../../model/srcc/tyreModel.mjs";

const router = express.Router();

router.post("/api/add-tyre-blast", async (req, res) => {
  const {
    tyre_no,
    blast_truck_no,
    blast_date,
    blast_driver,
    blast_odometer,
    blast_remarks,
    blast_images,
  } = req.body;

  try {
    const existingTyre = await TyreModel.findOne({ tyre_no });

    if (existingTyre) {
      await TyreModel.updateOne(
        { tyre_no },
        {
          $set: {
            blast_truck_no,
            blast_date,
            blast_driver,
            blast_odometer,
            blast_remarks,
            blast_images,
          },
        }
      );

      res.status(200).json({ message: "Blast details updated successfully" });
    } else {
      res.status(200).json({ message: "Tyre does not exist" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
