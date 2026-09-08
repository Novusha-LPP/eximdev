import express from "express";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import Contract from "../../model/it-helpdesk/contractModel.mjs";
import License from "../../model/it-helpdesk/licenseModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

function computeStatus(dateStr) {
  if (!dateStr) return { status: "Unknown", diffDays: 0, cls: "badge-secondary" };
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: "Expired", diffDays, cls: "badge-danger" };
  if (diffDays <= 30) return { status: "Expiring Soon", diffDays, cls: "badge-warning" };
  return { status: "Upcoming", diffDays, cls: "badge-excellent" };
}

// ── GET notification stats ───────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [assets, contracts, licenses] = await Promise.all([
      Asset.find({ warranty_expiry: { $ne: null } }).select("warranty_expiry").lean(),
      Contract.find({ end_date: { $ne: null } }).select("end_date").lean(),
      License.find({ expiry_date: { $ne: null } }).select("expiry_date").lean(),
    ]);

    let expiring = 0;
    let expired = 0;
    let upcoming = 0;

    const checkDate = (d) => {
      if (!d) return;
      const comp = computeStatus(d);
      if (comp.status === "Expiring Soon") expiring++;
      else if (comp.status === "Expired") expired++;
      else if (comp.status === "Upcoming") upcoming++;
    };

    assets.forEach((a) => checkDate(a.warranty_expiry));
    contracts.forEach((c) => checkDate(c.end_date));
    licenses.forEach((l) => checkDate(l.expiry_date));

    const total = assets.length + contracts.length + licenses.length;

    res.json({
      success: true,
      data: {
        total,
        expiring,
        expired,
        upcoming,
      },
    });
  } catch (err) {
    logger.error(`Error fetching notification stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET notifications with pagination & filtering ────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { type, category, status, search, page = 1, limit = 10, all } = req.query;

    const selectedType = type || category;
    const fetchWarranties = !selectedType || selectedType === "Warranty Expiry";
    const fetchContracts = !selectedType || selectedType === "Contract Renewal";
    const fetchLicenses = !selectedType || selectedType === "License Expiry";

    const [assets, contracts, licenses] = await Promise.all([
      fetchWarranties
        ? Asset.find({ warranty_expiry: { $ne: null } }).lean()
        : Promise.resolve([]),
      fetchContracts
        ? Contract.find({ end_date: { $ne: null } }).populate("vendor", "name").lean()
        : Promise.resolve([]),
      fetchLicenses
        ? License.find({ expiry_date: { $ne: null } }).lean()
        : Promise.resolve([]),
    ]);

    const warrantyAlerts = assets.map((a) => {
      const comp = computeStatus(a.warranty_expiry);
      return {
        _id: `asset_${a._id}`,
        type: "Warranty Expiry",
        item: a.asset_tag || a.asset_name || "Hardware Asset",
        details: `${a.asset_type || "Device"} - ${a.manufacturer || ""} ${a.model || ""}`.trim(),
        date: a.warranty_expiry,
        status: comp.status,
        diffDays: comp.diffDays,
        cls: comp.cls,
      };
    });

    const contractAlerts = contracts.map((c) => {
      const comp = computeStatus(c.end_date);
      return {
        _id: `contract_${c._id}`,
        type: "Contract Renewal",
        item: c.contract_number || c.contract_name || "AMC Contract",
        details: c.vendor_name || c.vendor?.name || "Maintenance Partner",
        date: c.end_date,
        status: comp.status,
        diffDays: comp.diffDays,
        cls: comp.cls,
      };
    });

    const licenseAlerts = licenses.map((l) => {
      const comp = computeStatus(l.expiry_date);
      return {
        _id: `license_${l._id}`,
        type: "License Expiry",
        item: l.software_name || l.license_name || "Software License",
        details: `Key: ${l.license_code || "N/A"} - Assigned: ${l.assigned_to || "Unassigned"}`,
        date: l.expiry_date,
        status: comp.status,
        diffDays: comp.diffDays,
        cls: comp.cls,
      };
    });

    let allAlerts = [...warrantyAlerts, ...contractAlerts, ...licenseAlerts].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Apply filtering
    if (status && status !== "ALL") {
      allAlerts = allAlerts.filter((a) => a.status === status);
    }

    if (search) {
      const term = String(search).trim().toLowerCase();
      allAlerts = allAlerts.filter(
        (a) =>
          a.item.toLowerCase().includes(term) ||
          a.type.toLowerCase().includes(term) ||
          (a.details || "").toLowerCase().includes(term)
      );
    }

    if (all === "true") {
      return res.json({ success: true, data: allAlerts });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const skip = (pageNum - 1) * limitNum;
    const total = allAlerts.length;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const paginatedAlerts = allAlerts.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paginatedAlerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    logger.error(`Error fetching notifications: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
