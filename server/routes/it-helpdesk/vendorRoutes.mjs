import express from "express";
import mongoose from "mongoose";
import Vendor from "../../model/it-helpdesk/vendorModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

// ── GET vendor stats ──────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [total, active, inactive, suppliers] = await Promise.all([
      Vendor.countDocuments({ is_active: true }),
      Vendor.countDocuments({ is_active: true, status: "Active" }),
      Vendor.countDocuments({ is_active: true, status: "Inactive" }),
      Vendor.countDocuments({
        is_active: true,
        vendor_type: { $in: ["Supplier", "Service Provider", "Hardware", "Software"] },
      }),
    ]);
    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        suppliers,
      },
    });
  } catch (err) {
    logger.error(`Error fetching vendor stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET all vendors with pagination & filtering ──────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { status, vendor_type, type, search, page = 1, limit = 15, all, fromDate, toDate } = req.query;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = status;
    }

    const selectedType = vendor_type || type;
    if (selectedType && selectedType !== "ALL") {
      filter.vendor_type = selectedType;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { vendor_code: searchRegex },
        { contact_person: searchRegex },
        { email: searchRegex },
        { mobile_number: searchRegex },
        { gst_number: searchRegex },
        { pan_number: searchRegex },
      ];
    }

    if (all === "true") {
      const data = await Vendor.find(filter).sort({ createdAt: -1 });
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Vendor.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Vendor.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error(`Error fetching vendors: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Validation patterns for Indian standard registration and contact numbers
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Reusable server-side validator and sanitizer for Vendor payloads
 */
const validateVendorData = (data, isUpdate = false) => {
  const errors = {};
  const sanitized = {};

  // 1. Validate Company / Vendor Name (Required)
  if (data.name !== undefined) {
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      errors.name = "Company / Vendor name is required";
    } else {
      sanitized.name = data.name.trim();
    }
  } else if (!isUpdate) {
    errors.name = "Company / Vendor name is required";
  }

  // 2. Validate Contact Person (Required)
  if (data.contact_person !== undefined) {
    if (!data.contact_person || typeof data.contact_person !== "string" || !data.contact_person.trim()) {
      errors.contact_person = "Contact person name is required";
    } else {
      sanitized.contact_person = data.contact_person.trim();
    }
  } else if (!isUpdate) {
    errors.contact_person = "Contact person name is required";
  }

  // 3. Validate Mobile Number (Required, 10 digits starting with 6,7,8,9)
  if (data.mobile_number !== undefined) {
    const rawMobile = typeof data.mobile_number === "string" ? data.mobile_number.trim() : String(data.mobile_number || "").trim();
    if (!rawMobile) {
      errors.mobile_number = "Mobile number is required";
    } else if (!MOBILE_REGEX.test(rawMobile)) {
      errors.mobile_number = "Invalid mobile number. Must be a 10-digit number starting with 6, 7, 8, or 9";
    } else {
      sanitized.mobile_number = rawMobile;
    }
  } else if (!isUpdate) {
    errors.mobile_number = "Mobile number is required";
  }

  // 4. Validate Email Address (Required, standard format)
  if (data.email !== undefined) {
    const rawEmail = typeof data.email === "string" ? data.email.trim() : String(data.email || "").trim();
    if (!rawEmail) {
      errors.email = "Email address is required";
    } else if (!EMAIL_REGEX.test(rawEmail)) {
      errors.email = "Invalid email address format (e.g. name@domain.com)";
    } else {
      sanitized.email = rawEmail.toLowerCase();
    }
  } else if (!isUpdate) {
    errors.email = "Email address is required";
  }

  // 5. Validate GST Number (Optional, 15 chars standard GSTIN if present)
  if (data.gst_number !== undefined) {
    const rawGst = typeof data.gst_number === "string" ? data.gst_number.trim().toUpperCase() : String(data.gst_number || "").trim().toUpperCase();
    if (rawGst) {
      if (!GSTIN_REGEX.test(rawGst)) {
        errors.gst_number = "Invalid GSTIN format. Expected 15 characters (e.g. 24AAAAA0000A1Z5)";
      } else {
        sanitized.gst_number = rawGst;
      }
    } else {
      sanitized.gst_number = "";
    }
  }

  // 6. Validate PAN Number (Optional, 10 chars standard PAN if present)
  if (data.pan_number !== undefined) {
    const rawPan = typeof data.pan_number === "string" ? data.pan_number.trim().toUpperCase() : String(data.pan_number || "").trim().toUpperCase();
    if (rawPan) {
      if (!PAN_REGEX.test(rawPan)) {
        errors.pan_number = "Invalid PAN format. Expected 10 characters (e.g. AAAAA0000A)";
      } else {
        sanitized.pan_number = rawPan;
      }
    } else {
      sanitized.pan_number = "";
    }
  }

  // Vendor Type & Status handling
  if (data.vendor_type || data.type) {
    sanitized.vendor_type = (data.vendor_type || data.type).trim();
  }
  if (data.status) {
    sanitized.status = data.status === "Inactive" ? "Inactive" : "Active";
  }
  if (data.vendor_code !== undefined) {
    sanitized.vendor_code = String(data.vendor_code || "").trim();
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
};

/**
 * Check if name, mobile_number, gst_number, or pan_number is already registered
 */
const checkVendorUniqueness = async (sanitized, targetId = null) => {
  const duplicateErrors = {};
  const queryBase = targetId ? { _id: { $ne: targetId } } : {};

  // 1. Check Company / Vendor Name
  if (sanitized.name) {
    const escapedName = sanitized.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingName = await Vendor.findOne({
      ...queryBase,
      name: { $regex: new RegExp(`^${escapedName}$`, "i") }
    });
    if (existingName) {
      duplicateErrors.name = "A vendor with this name already exists";
    }
  }

  // 2. Check Mobile Number (Must be unique)
  if (sanitized.mobile_number) {
    const existingMobile = await Vendor.findOne({
      ...queryBase,
      mobile_number: sanitized.mobile_number
    });
    if (existingMobile) {
      duplicateErrors.mobile_number = "A vendor with this mobile number already exists";
    }
  }

  // 3. Check GST Number (Must be unique if provided)
  if (sanitized.gst_number) {
    const existingGst = await Vendor.findOne({
      ...queryBase,
      gst_number: sanitized.gst_number
    });
    if (existingGst) {
      duplicateErrors.gst_number = "A vendor with this GST number already exists";
    }
  }

  // 4. Check PAN Number (Must be unique if provided)
  if (sanitized.pan_number) {
    const existingPan = await Vendor.findOne({
      ...queryBase,
      pan_number: sanitized.pan_number
    });
    if (existingPan) {
      duplicateErrors.pan_number = "A vendor with this PAN number already exists";
    }
  }

  return duplicateErrors;
};

/**
 * Extract field-specific duplicate key messages from MongoDB E11000 errors
 */
const parseDuplicateKeyError = (err) => {
  const duplicateErrors = {};
  let errorMessage = "Duplicate entry detected";

  const keyPattern = err.keyPattern || {};
  const keyValue = err.keyValue || {};
  const msg = err.message || "";

  if (keyPattern.gst_number || keyValue.gst_number || msg.includes("gst_number")) {
    errorMessage = "A vendor with this GST number already exists";
    duplicateErrors.gst_number = errorMessage;
  } else if (keyPattern.pan_number || keyValue.pan_number || msg.includes("pan_number")) {
    errorMessage = "A vendor with this PAN number already exists";
    duplicateErrors.pan_number = errorMessage;
  } else if (keyPattern.mobile_number || keyValue.mobile_number || msg.includes("mobile_number")) {
    errorMessage = "A vendor with this mobile number already exists";
    duplicateErrors.mobile_number = errorMessage;
  } else if (keyPattern.name || keyValue.name || msg.includes("name_1")) {
    errorMessage = "A vendor with this name already exists";
    duplicateErrors.name = errorMessage;
  } else {
    errorMessage = "A vendor with this unique detail already exists";
  }

  return { errorMessage, duplicateErrors };
};

router.post("/", async (req, res) => {
  try {
    const { isValid, errors, sanitized } = validateVendorData(req.body, false);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    // Pre-save uniqueness validation for GST, PAN, Mobile, and Name
    const duplicateErrors = await checkVendorUniqueness(sanitized);
    if (Object.keys(duplicateErrors).length > 0) {
      const firstError = Object.values(duplicateErrors)[0];
      return res.status(409).json({
        success: false,
        message: firstError,
        errors: duplicateErrors
      });
    }

    // Ensure is_active is set to true for new vendors
    const vendorData = { ...req.body, ...sanitized, is_active: true };
    
    const vendor = new Vendor(vendorData);
    const savedVendor = await vendor.save();
    
    res.status(201).json({ success: true, data: savedVendor });
  } catch (err) {
    console.error("Error creating vendor:", err);
    logger.error(`Error creating vendor: ${err.message}`, { stack: err.stack });
    
    let errorMessage = "Error creating vendor";
    let statusCode = 500;
    let duplicateErrors = {};

    if (err.name === "ValidationError") {
      statusCode = 400;
      errorMessage = `Validation error: ${Object.values(err.errors).map(e => e.message).join(", ")}`;
    } else if (err.code === 11000) {
      statusCode = 409;
      const parsed = parseDuplicateKeyError(err);
      errorMessage = parsed.errorMessage;
      duplicateErrors = parsed.duplicateErrors;
    } else if (err.name === "MongoError") {
      errorMessage = `Database error: ${err.message}`;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      ...(Object.keys(duplicateErrors).length > 0 ? { errors: duplicateErrors } : {})
    });
  }
});

router.put("/:id", validateId, async (req, res) => {
  try {
    const currentVendor = await Vendor.findById(req.params.id);
    if (!currentVendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    const { isValid, errors, sanitized } = validateVendorData(req.body, true);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors
      });
    }

    // Pre-save uniqueness validation for GST, PAN, Mobile, and Name excluding current vendor
    const duplicateErrors = await checkVendorUniqueness(sanitized, req.params.id);
    if (Object.keys(duplicateErrors).length > 0) {
      const firstError = Object.values(duplicateErrors)[0];
      return res.status(409).json({
        success: false,
        message: firstError,
        errors: duplicateErrors
      });
    }
    
    const updateData = { ...req.body, ...sanitized };
    if (!updateData.hasOwnProperty("is_active")) {
      updateData.is_active = currentVendor.is_active;
    }
    
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, data: vendor });
  } catch (err) {
    console.error("Error updating vendor:", err);
    logger.error(`Error updating vendor: ${err.message}`, { stack: err.stack });
    
    let errorMessage = "Error updating vendor";
    let statusCode = 500;
    let duplicateErrors = {};

    if (err.name === "ValidationError") {
      statusCode = 400;
      errorMessage = `Validation error: ${Object.values(err.errors).map(e => e.message).join(", ")}`;
    } else if (err.code === 11000) {
      statusCode = 409;
      const parsed = parseDuplicateKeyError(err);
      errorMessage = parsed.errorMessage;
      duplicateErrors = parsed.duplicateErrors;
    } else if (err.name === "MongoError") {
      errorMessage = `Database error: ${err.message}`;
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      ...(Object.keys(duplicateErrors).length > 0 ? { errors: duplicateErrors } : {})
    });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Vendor deleted" });
  } catch (err) {
    logger.error(`Error deleting vendor: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
