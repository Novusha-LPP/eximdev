import express from "express";
import DriverDetails from "../../model/srcc/driverDetails.mjs";

const router = express.Router();

router.post("/api/add-driver-details", async (req, res) => {
  const {
    driver_name,
    driver_phone,
    driver_license,
    license_validity,
    driver_address,
    joining_date,
    blood_group,
    driver_photo,
    license_photo,
  } = req.body;

  try {
    const existingDriver = await DriverDetails.findOne({
      driver_name,
    });

    if (existingDriver) {
      res.status(200).json({ message: "Driver already exists" });
    } else {
      const newDriver = new DriverDetails({
        driver_name,
        driver_phone,
        driver_license,
        license_validity,
        driver_address,
        joining_date,
        blood_group,
        driver_photo,
        license_photo,
        _date: new Date().toLocaleDateString("en-GB"),
      });
      await newDriver.save();
      res.status(200).json({ message: "Driver added successfully" });
    }
  } catch (err) {
    console.log(err);
  }
});

export default router;
