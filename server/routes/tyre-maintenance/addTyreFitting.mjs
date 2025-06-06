import express from "express";
import tyreModel from "../../model/srcc/tyreModel.mjs";

const router = express.Router();

router.post("/api/add-tyre-fitting", async (req, res) => {
  const { tyre_no, truck_no, fitting_date, fitting_date_odometer, location } =
    req.body;

  try {
    const existingTyre = await tyreModel.findOne({ tyre_no });

    if (existingTyre) {
      const trucks = existingTyre.trucks;

      // Check if the last truck in the array has the same truck_no
      if (
        trucks.length > 0 &&
        trucks[trucks.length - 1].truck_no === truck_no
      ) {
        res
          .status(200)
          .json({ message: "Tyre is already installed in this truck" });
      } else {
        // Push a new truck object into the array
        existingTyre.trucks.push({
          truck_no,
          fitting_date,
          fitting_date_odometer,
          location,
          _fitting_date_added: new Date().toLocaleDateString("en-GB"),
        });

        // Save the updated document

        await existingTyre.save();

        res.status(200).json({ message: "Tyre updated successfully" });
      }
    } else {
      res.status(200).json({ message: "Tyre does not exist" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
