import express from "express";
import Vendors from "../../model/srcc/vendors.mjs";

const router = express.Router();

router.post("/api/add-vendor", async (req, res) => {
  const { vendor_name, vendor_address, vendor_phone } = req.body;

  try {
    const existingVendor = await Vendors.findOne({ vendor_name });
    if (existingVendor) {
      res.status(200).json({ message: "Vendor already exists" });
    } else {
      const newVendor = new Vendors({
        vendor_name,
        vendor_address,
        vendor_phone,
        _date: new Date().toLocaleDateString("en-GB"),
      });
      await newVendor.save();
      res.status(200).json({ message: "Vendor added successfully" });
    }
  } catch (err) {
    console.log(err);
  }
});

export default router;
