import express from "express";
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// GET all organizations (Customer KYC mapped)
router.get("/organization", async (req, res) => {
  try {
    const records = await CustomerKycModel.find().lean();
    const organizations = records.map(record => ({
      _id: record._id,
      name: record.name_of_individual || "",
      contact: record.permanent_address_telephone || "",
      email: record.permanent_address_email || "",
      category: record.category || "Company",
      iec_no: record.iec_no || "",
      gst_no: record.gst_no || "",
      pan_no: record.pan_no || "",
      approval: record.approval || "Pending",
      // Mapped address details
      addressDetails: {
        line1: record.permanent_address_line_1 || "",
        line2: record.permanent_address_line_2 || "",
        city: record.permanent_address_city || "",
        state: record.permanent_address_state || "",
        pinCode: record.permanent_address_pin_code || ""
      },
      banks: record.banks || [],
      branches: record.branches || [],
      factory_addresses: record.factory_addresses || []
    }));
    res.status(200).json({ organizations });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// POST new organization (Create draft KYC)
router.post("/organization", auditMiddleware("Organization"), async (req, res) => {
  const { 
    name, contact, email, address, banks, branches, 
    iec_no, gst_no, pan_no, category, factory_addresses 
  } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Organization name is required" });
  }

  try {
    // Check if iec_no is provided, otherwise generate a draft one
    const finalIecNo = iec_no || `DRAFT-${Date.now()}`;

    // Verify uniqueness if it's a real IEC NO (or even if it's our draft one)
    const existing = await CustomerKycModel.findOne({ iec_no: finalIecNo });
    if (existing) {
      return res.status(400).json({ message: `IEC Number ${finalIecNo} already exists in records.` });
    }

    const newKyc = new CustomerKycModel({
      iec_no: finalIecNo,
      name_of_individual: name,
      permanent_address_telephone: contact,
      permanent_address_email: email,
      gst_no: gst_no || "",
      pan_no: pan_no || "",
      category: category || "Company",
      // Address mapping
      permanent_address_line_1: address?.line1 || "",
      permanent_address_line_2: address?.line2 || "",
      permanent_address_city: address?.city || "",
      permanent_address_state: address?.state || "",
      permanent_address_pin_code: address?.pinCode || "",
      // Arrays
      banks: banks || [],
      branches: branches || [],
      factory_addresses: factory_addresses || [],
      // Defaults
      draft: "true",
      approval: "Pending",
      status: "Trader"
    });

    await newKyc.save();

    res.status(201).json({
      message: "Organization created successfully",
      organization: {
        _id: newKyc._id,
        name: newKyc.name_of_individual,
        contact: newKyc.permanent_address_telephone,
        email: newKyc.permanent_address_email,
        category: newKyc.category,
        iec_no: newKyc.iec_no,
        gst_no: newKyc.gst_no,
        pan_no: newKyc.pan_no,
        approval: newKyc.approval,
        addressDetails: {
          line1: newKyc.permanent_address_line_1,
          line2: newKyc.permanent_address_line_2,
          city: newKyc.permanent_address_city,
          state: newKyc.permanent_address_state,
          pinCode: newKyc.permanent_address_pin_code
        },
        banks: newKyc.banks,
        branches: newKyc.branches,
        factory_addresses: newKyc.factory_addresses
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating organization", error: error.message });
  }
});

// PUT update organization
router.put("/organization/:id", auditMiddleware("Organization"), async (req, res) => {
  const { id } = req.params;
  const { 
    name, contact, email, address, banks, branches, 
    iec_no, gst_no, pan_no, category, factory_addresses 
  } = req.body;

  try {
    const kyc = await CustomerKycModel.findById(id);
    if (!kyc) {
      return res.status(404).json({ message: "Organization not found" });
    }

    // Update fields
    if (name) kyc.name_of_individual = name;
    if (contact) kyc.permanent_address_telephone = contact;
    if (email) kyc.permanent_address_email = email;
    if (iec_no) kyc.iec_no = iec_no;
    if (gst_no !== undefined) kyc.gst_no = gst_no;
    if (pan_no !== undefined) kyc.pan_no = pan_no;
    if (category) kyc.category = category;
    
    if (address) {
      kyc.permanent_address_line_1 = address.line1 || kyc.permanent_address_line_1;
      kyc.permanent_address_line_2 = address.line2 || kyc.permanent_address_line_2;
      kyc.permanent_address_city = address.city || kyc.permanent_address_city;
      kyc.permanent_address_state = address.state || kyc.permanent_address_state;
      kyc.permanent_address_pin_code = address.pinCode || kyc.permanent_address_pin_code;
    }

    if (banks) kyc.banks = banks;
    if (branches) kyc.branches = branches;
    if (factory_addresses) kyc.factory_addresses = factory_addresses;

    await kyc.save();

    res.status(200).json({
      message: "Organization updated successfully",
      organization: {
        _id: kyc._id,
        name: kyc.name_of_individual,
        contact: kyc.permanent_address_telephone,
        email: kyc.permanent_address_email,
        category: kyc.category,
        iec_no: kyc.iec_no,
        gst_no: kyc.gst_no,
        pan_no: kyc.pan_no,
        approval: kyc.approval,
        addressDetails: {
          line1: kyc.permanent_address_line_1,
          line2: kyc.permanent_address_line_2,
          city: kyc.permanent_address_city,
          state: kyc.permanent_address_state,
          pinCode: kyc.permanent_address_pin_code
        },
        banks: kyc.banks,
        branches: kyc.branches,
        factory_addresses: kyc.factory_addresses
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "IEC Number already exists in records." });
    }
    res.status(500).json({ message: "Error updating organization", error: error.message });
  }
});

// DELETE organization
router.delete("/organization/:id", auditMiddleware("Organization"), async (req, res) => {
  const { id } = req.params;
  try {
    const kyc = await CustomerKycModel.findByIdAndDelete(id);
    if (!kyc) return res.status(404).json({ message: "Organization not found" });
    res.status(200).json({ message: "Organization record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

export default router;
