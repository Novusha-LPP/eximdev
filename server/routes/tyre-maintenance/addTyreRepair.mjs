import express from "express";
import Tyre from "../../model/srcc/tyreModel.mjs";

const router = express.Router();

router.post("/api/add-tyre-repairs", async (req, res) => {
  const {
    tyre_no,
    truck_no,
    vendor,
    bill_no,
    bill_date,
    amount,
    repair_type,
    repair_date_odometer,
    tyre_repair_invoice_images,
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
        existingTyre.trucks[truckIndex].repairs.push({
          bill_no,
          bill_date,
          amount,
          repair_type,
          repair_date_odometer,
          vendor,
          tyre_repair_invoice_images,
          _repair_date_added: new Date().toLocaleDateString("en-GB"),
        });

        // Save the updated document
        await existingTyre.save();

        res.status(200).json({ message: "Repair data added successfully" });
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
