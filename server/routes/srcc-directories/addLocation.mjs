import express from "express";
import LocationMaster from "../../model/srcc/locationMaster.mjs";

const router = express.Router();

router.post("/api/add-location", async (req, res) => {
  try {
    const { location, district, area, pincode } = req.body;

    // Try to find a document with the given district
    let locationMaster = await LocationMaster.findOne({ district });

    if (locationMaster) {
      // If the document exists, push the new area and pincode
      locationMaster.area.push({ area, pincode });
      await locationMaster.save();
      res.status(200).json({ message: "Location Master Created Successfully" });
    } else {
      // If the document doesn't exist, create a new one
      locationMaster = await LocationMaster.create({
        location,
        district,
        area: [{ area, pincode }],
      });
      res.status(201).json({ message: "Location Master Created Successfully" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
