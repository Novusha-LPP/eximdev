import express from "express";
import mongoose from "mongoose";
import AmcRenewalModel from "../../model/amcRenewalModel.mjs";

const router = express.Router();

// ─── Validate ObjectId ─────────────────────────────────────────────────────
const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(422)
      .json({ success: false, message: "Invalid record ID" });
  }
  next();
};

// ─── GET /api/amc-renewals ─────────────────────────────────────────────────
// List all AMC renewal records with optional filters
router.get("/", async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { equipmentServiceName: new RegExp(search, "i") },
        { vendorName: new RegExp(search, "i") },
        { contractNo: new RegExp(search, "i") },
        { contactPerson: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await Promise.all([
      AmcRenewalModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AmcRenewalModel.countDocuments(filter),
    ]);

    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/amc-renewals/stats ───────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const [total, active, pending, expired] = await Promise.all([
      AmcRenewalModel.countDocuments(),
      AmcRenewalModel.countDocuments({ status: "Active" }),
      AmcRenewalModel.countDocuments({ status: "Pending" }),
      AmcRenewalModel.countDocuments({ status: "Expired" }),
    ]);
    res.json({ success: true, data: { total, active, pending, expired } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/amc-renewals/:id ─────────────────────────────────────────────
router.get("/:id", validateId, async (req, res) => {
  try {
    const doc = await AmcRenewalModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/amc-renewals ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      equipmentServiceName, vendorName, underAmc, contractNo, location,
      yearlyServices, startMonthDate, previousDateOfService, nextDueDate,
      renewalDate, expireDate, contactPerson, contactNo, status, remarks, documentUrl,
    } = req.body;

    if (!equipmentServiceName || !vendorName) {
      return res.status(422).json({
        success: false,
        message: "Equipment/Service Name and Vendor Name are required",
      });
    }

    if (contactNo && contactNo.trim()) {
      const digits = contactNo.replace(/\D/g, "");
      if (digits.length !== 10) {
        return res.status(422).json({
          success: false,
          message: "Contact number must be exactly 10 digits",
        });
      }
    }

    const doc = new AmcRenewalModel({
      equipmentServiceName, vendorName, underAmc, contractNo, location,
      yearlyServices, startMonthDate, previousDateOfService, nextDueDate,
      renewalDate, expireDate, contactPerson,
      contactNo: contactNo ? contactNo.replace(/\D/g, "").slice(0, 10) : "",
      status: status || "Active", remarks, documentUrl,
    });

    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUT /api/amc-renewals/:id ─────────────────────────────────────────────
router.put("/:id", validateId, async (req, res) => {
  try {
    const doc = await AmcRenewalModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });

    if (req.body.contactNo !== undefined && req.body.contactNo !== null && req.body.contactNo.toString().trim() !== "") {
      const digits = req.body.contactNo.toString().replace(/\D/g, "");
      if (digits.length !== 10) {
        return res.status(422).json({
          success: false,
          message: "Contact number must be exactly 10 digits",
        });
      }
    }

    const allowed = [
      "equipmentServiceName", "vendorName", "underAmc", "contractNo", "location",
      "yearlyServices", "startMonthDate", "previousDateOfService", "nextDueDate",
      "renewalDate", "expireDate", "contactPerson", "contactNo", "status",
      "remarks", "documentUrl",
    ];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) {
        if (k === "contactNo" && req.body[k]) {
          doc[k] = req.body[k].toString().replace(/\D/g, "").slice(0, 10);
        } else {
          doc[k] = req.body[k];
        }
      }
    });

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE /api/amc-renewals/:id ──────────────────────────────────────────
router.delete("/:id", validateId, async (req, res) => {
  try {
    const doc = await AmcRenewalModel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
