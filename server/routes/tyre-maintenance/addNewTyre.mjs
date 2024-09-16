import express from "express";
import Tyre from "../../model/srcc/tyreModel.mjs";
import tyreModels from "../../model/srcc/tyreModels.mjs";
import Vendors from "../../model/srcc/vendors.mjs";

const router = express.Router();

router.post("/api/add-new-tyre", async (req, res) => {
  const {
    tyre_no,
    bill_no,
    bill_date,
    vendor_name,
    tyre_model,
    tyre_brand,
    tyre_type,
    tyre_size,
    ply_rating,
    warranty_date,
    tyre_invoice_image,
  } = req.body;
  try {
    const existingTyre = await Tyre.findOne({ tyre_no });
    if (existingTyre) {
      res.status(200).send({ message: "Tyre already exists" });
    } else {
      const existingBrand = await tyreModels.findOne({ tyre_model });
      const existingVendor = await Vendors.findOne({ vendor_name });
      const newTyre = new Tyre({
        tyre_no,
        bill_no,
        bill_date,
        warranty_date,
        vendor_name,
        vendor_address: existingVendor?.vendor_address,
        vendor_phone: existingVendor?.vendor_phone,
        tyre_model,
        tyre_brand,
        tyre_type,
        tyre_size,
        ply_rating,
        tyre_brand: existingBrand?.tyre_brand,
        tyre_invoice_image: tyre_invoice_image,
      });
      await newTyre.save();
      res.status(200).json({ message: "Tyre inserted successfully" });
    }
  } catch (err) {
    // Handle any errors here
    console.error(err);
    res.status(500).json({ message: "An error occurred" });
  }
});

export default router;
