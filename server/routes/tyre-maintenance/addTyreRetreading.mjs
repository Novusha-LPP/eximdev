import express from "express";
import Tyre from "../../model/srcc/tyreModel.mjs";

const router = express.Router();

router.post("/api/add-tyre-retreading", async (req, res) => {
  const {
    tyre_no,
    truck_no,
    vendor,
    retreading_date,
    tread_pattern,
    retreading_date_odometer,
    amount,
    tyre_retreading_invoice_images,
  } = req.body;

  try {
    // Check if the "tyre_no" exists in the database
    const existingTyre = await Tyre.findOne({ tyre_no });

    if (existingTyre) {
      // Check if the "truck_no" exists in the existingTyre
      const truckIndex = existingTyre.trucks.findIndex(
        (truck) => truck.truck_no === truck_no
      );

      if (truckIndex !== -1) {
        // If the truck exists, add the repair data
        existingTyre.trucks[truckIndex].retreading.push({
          vendor,
          retreading_date,
          tread_pattern,
          retreading_date_odometer,
          amount,
          tyre_retreading_invoice_images,
        });

        // Save the updated document
        await existingTyre.save();

        res.status(200).json({ message: "Retreading data added successfully" });
      } else {
        res.status(200).json({ message: "Truck not found" });
      }
    } else {
      res.status(200).json({ message: "Tyre not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal Server Error");
  }
});

export default router;
