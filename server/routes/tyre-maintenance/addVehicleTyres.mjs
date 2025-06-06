import express from "express";
import Truck from "../../model/srcc/vehicleModel.mjs";

const router = express.Router();

router.post("/api/add-vehicle-tyres", async (req, res) => {
  const { tyre_no, truck_no, fitting_date, fitting_date_odometer, location } =
    req.body;
  console.log(tyre_no, truck_no, fitting_date, fitting_date_odometer, location);
  const existingTruck = await Truck.findOne({ truck_no });

  if (existingTruck) {
    const existingTyre = existingTruck.tyres.find(
      (tyre) => tyre.tyre_no === tyre_no
    );
    if (existingTyre) {
      res.status(400).send({
        message: "This tyre number already exists for this truck.",
      });
    } else {
      existingTruck.tyres.push({
        tyre_no,
        fitting_date,
        fitting_date_odometer,
        location,
      });
      await existingTruck.save();
      res.status(201).send({ message: "Tyre added successfully" });
    }
  } else {
    const newTruck = new Truck({
      truck_no,
      tyres: [
        {
          tyre_no,
          fitting_date,
          fitting_date_odometer,
          location,
        },
      ],
    });

    await newTruck.save();
    res.status(201).send({ message: "Truck and tyre added successfully" });
  }
});

export default router;
