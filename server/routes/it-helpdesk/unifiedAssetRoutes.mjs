import express from "express";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import ITUnifiedAsset from "../../model/it-helpdesk/unifiedAssetModel.mjs";
import User from "../../model/userModel.mjs";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import Inventory from "../../model/it-helpdesk/inventoryModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID parameter" });
  }
  next();
};

// ── GET STATS ────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);

    const [
      total,
      inStock,
      assigned,
      spares,
      maintenance,
      retired,
      expiringWarranty,
      newStock,
      oldStock,
    ] = await Promise.all([
      ITUnifiedAsset.countDocuments({}),
      ITUnifiedAsset.countDocuments({ lifecycle_status: { $in: ["In Stock", "Available"] } }),
      ITUnifiedAsset.countDocuments({ lifecycle_status: { $in: ["Assigned", "In Use"] } }),
      ITUnifiedAsset.countDocuments({ lifecycle_status: "Spare" }),
      ITUnifiedAsset.countDocuments({
        lifecycle_status: { $in: ["Under Maintenance", "Under Repair"] },
      }),
      ITUnifiedAsset.countDocuments({ lifecycle_status: { $in: ["Retired", "Disposed"] } }),
      ITUnifiedAsset.countDocuments({
        warranty_end_date: { $gte: today, $lte: in30Days },
      }),
      ITUnifiedAsset.countDocuments({
        $or: [{ inventory_type: "New Inventory" }, { stock_type: "New" }],
      }),
      ITUnifiedAsset.countDocuments({
        $or: [{ inventory_type: "Old Inventory" }, { stock_type: "Old" }],
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        inStock,
        assigned,
        spares,
        maintenance,
        retired,
        expiringWarranty,
        newStock,
        oldStock,
      },
    });
  } catch (err) {
    logger.error(`Error fetching unified asset stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET NEXT ASSET TAG ───────────────────────────────────────────────────────
router.get("/next-tag", async (req, res) => {
  try {
    const currentYear = new Date().getFullYear(); // 2026
    const yearPrefix = `AST-${currentYear}-`;
    const regex = new RegExp(`^AST-${currentYear}-([0-9]+)$`, "i");

    // Find all assets in current year's series
    const items = await ITUnifiedAsset.find({ asset_tag: regex }, { asset_tag: 1 }).lean();

    let maxSeq = 0;
    for (const it of items) {
      if (!it.asset_tag) continue;
      const match = it.asset_tag.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let nextNum = maxSeq + 1;
    let nextTag = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;

    // Safety loop: ensure tag is 100% unique in database
    while (
      await ITUnifiedAsset.findOne({
        asset_tag: { $regex: new RegExp(`^${nextTag}$`, "i") },
      })
    ) {
      nextNum++;
      nextTag = `${yearPrefix}${String(nextNum).padStart(3, "0")}`;
    }

    res.json({ success: true, nextTag });
  } catch (err) {
    logger.error(`Error generating next asset tag: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL WITH FILTERS & PAGINATION ─────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const {
      status,
      lifecycle_status,
      inventory_type,
      condition,
      stock_type,
      category,
      department,
      warranty_status,
      search,
      page = 1,
      limit = 15,
      all,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = {};

    // Lifecycle Status filter (supports both standard and legacy terms)
    const activeStatus = lifecycle_status || status;
    if (activeStatus && activeStatus !== "ALL" && activeStatus !== "all") {
      if (activeStatus === "In Stock" || activeStatus === "Available") {
        filter.lifecycle_status = { $in: ["In Stock", "Available"] };
      } else if (activeStatus === "Assigned" || activeStatus === "In Use") {
        filter.lifecycle_status = { $in: ["Assigned", "In Use"] };
      } else if (activeStatus === "Under Maintenance" || activeStatus === "Under Repair") {
        filter.lifecycle_status = { $in: ["Under Maintenance", "Under Repair"] };
      } else if (activeStatus === "Retired" || activeStatus === "Disposed") {
        filter.lifecycle_status = { $in: ["Retired", "Disposed"] };
      } else {
        filter.lifecycle_status = activeStatus;
      }
    }

    // Inventory Type filter (Old Inventory / New Inventory)
    if (inventory_type && inventory_type !== "ALL" && inventory_type !== "all") {
      filter.inventory_type = inventory_type;
    }

    // Condition filter (Good, Fair, Damaged, Non-Functional)
    if (condition && condition !== "ALL" && condition !== "all") {
      filter.condition = condition;
    }

    // Stock Type filter
    if (stock_type && stock_type !== "ALL" && stock_type !== "all") {
      filter.stock_type = stock_type;
    }

    // Category filter
    if (category && category !== "ALL" && category !== "all") {
      if (category === "Computer" || category === "Computer / Desktop") {
        filter.category = { $in: ["Computer", "Computer / Desktop"] };
      } else if (category === "Software" || category === "Software License") {
        filter.category = { $in: ["Software", "Software License"] };
      } else {
        filter.category = category;
      }
    }

    // Department filter
    if (department && department !== "ALL" && department !== "all") {
      filter.department = department;
    }

    // Warranty filter
    if (warranty_status) {
      const today = new Date();
      if (warranty_status === "active") {
        filter.warranty_end_date = { $gt: today };
      } else if (warranty_status === "expired") {
        filter.warranty_end_date = { $lt: today };
      } else if (warranty_status === "expiring") {
        const in30Days = new Date();
        in30Days.setDate(today.getDate() + 30);
        filter.warranty_end_date = { $gte: today, $lte: in30Days };
      } else if (warranty_status === "none") {
        filter.warranty_end_date = null;
      }
    }

    // Search filter
    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { asset_tag: searchRegex },
        { serial_number: searchRegex },
        { asset_name: searchRegex },
        { brand: searchRegex },
        { model: searchRegex },
        { assigned_to_name: searchRegex },
        { department: searchRegex },
        { "specs.ip_address": searchRegex },
      ];
    }

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    if (all === "true") {
      const data = await ITUnifiedAsset.find(filter)
        .populate("assigned_to", "name first_name last_name username email department designation")
        .populate("vendor", "vendor_name contact_person phone email")
        .sort(sortObj);
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      ITUnifiedAsset.find(filter)
        .populate("assigned_to", "name first_name last_name username email department designation")
        .populate("vendor", "vendor_name contact_person phone email")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      ITUnifiedAsset.countDocuments(filter),
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
    logger.error(`Error fetching unified assets: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE ASSET ─────────────────────────────────────────────────────────
router.get("/:id", validateId, async (req, res) => {
  try {
    const item = await ITUnifiedAsset.findById(req.params.id)
      .populate("assigned_to", "name first_name last_name username email department designation")
      .populate("vendor", "vendor_name contact_person phone email");

    if (!item) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE NEW ASSET ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };

    const cleanTag = String(payload.asset_tag || "").trim().toUpperCase();
    if (!cleanTag) {
      return res.status(422).json({ success: false, message: "Asset Tag is required." });
    }
    payload.asset_tag = cleanTag;

    const existing = await ITUnifiedAsset.findOne({
      asset_tag: { $regex: new RegExp(`^${cleanTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Asset Tag "${cleanTag}" already exists. Asset Tag must be unique.`,
      });
    }

    // Recommendation 3: Unique serial number validation
    if (payload.serial_number && String(payload.serial_number).trim() && String(payload.serial_number).trim().toUpperCase() !== "N/A") {
      const cleanSerial = String(payload.serial_number).trim();
      const conflictSerial = await ITUnifiedAsset.findOne({
        serial_number: { $regex: new RegExp(`^${cleanSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (conflictSerial) {
        return res.status(409).json({
          success: false,
          message: `Serial Number "${cleanSerial}" is already assigned to asset ${conflictSerial.asset_tag}. Serial Number must be unique.`,
        });
      }
    }

    // Resolve Assigned To Name if assigned_to is set
    if (payload.assigned_to && !payload.assigned_to_name) {
      const u = await User.findById(payload.assigned_to).select("first_name last_name username").lean();
      if (u) {
        payload.assigned_to_name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
      }
    }

    // Recommendation 7: Audit Fields
    const userName = req.user?.name || req.user?.username || "System";
    payload.created_by = req.user?._id || null;
    payload.created_by_name = userName;
    payload.updated_by = req.user?._id || null;
    payload.updated_by_name = userName;

    // Set initial history
    payload.history = [
      {
        action: "Created Equipment Record",
        changed_by: req.user?._id || null,
        changed_by_name: userName,
        timestamp: new Date(),
        remarks: payload.remarks || "Initial asset creation",
      },
    ];

    const newItem = new ITUnifiedAsset(payload);
    await newItem.save();

    res.status(201).json({ success: true, data: newItem });
  } catch (err) {
    logger.error(`Error creating unified asset: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE ASSET ─────────────────────────────────────────────────────────────
router.put("/:id", validateId, async (req, res) => {
  try {
    const payload = { ...req.body };
    const current = await ITUnifiedAsset.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    if (payload.asset_tag) {
      const cleanTag = String(payload.asset_tag).trim().toUpperCase();
      if (!cleanTag) {
        return res.status(422).json({ success: false, message: "Asset Tag cannot be empty." });
      }
      payload.asset_tag = cleanTag;

      if (cleanTag !== current.asset_tag) {
        const conflict = await ITUnifiedAsset.findOne({
          _id: { $ne: req.params.id },
          asset_tag: { $regex: new RegExp(`^${cleanTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });
        if (conflict) {
          return res.status(409).json({
            success: false,
            message: `Asset Tag "${cleanTag}" is already in use by another asset. Asset Tag must be unique.`,
          });
        }
      }
    }

    // Recommendation 3: Unique serial number validation on update
    if (payload.serial_number && String(payload.serial_number).trim() && String(payload.serial_number).trim().toUpperCase() !== "N/A") {
      const cleanSerial = String(payload.serial_number).trim();
      const conflictSerial = await ITUnifiedAsset.findOne({
        _id: { $ne: req.params.id },
        serial_number: { $regex: new RegExp(`^${cleanSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });
      if (conflictSerial) {
        return res.status(409).json({
          success: false,
          message: `Serial Number "${cleanSerial}" is already assigned to asset ${conflictSerial.asset_tag}. Serial Number must be unique.`,
        });
      }
    }

    // Resolve or clear Assigned To Name on update
    if (payload.assigned_to && !payload.assigned_to_name) {
      const u = await User.findById(payload.assigned_to).select("first_name last_name username").lean();
      if (u) {
        payload.assigned_to_name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
      }
    } else if (payload.assigned_to === null || payload.assigned_to === "") {
      payload.assigned_to = null;
      payload.assigned_to_name = "";
    }

    // Recommendation 7: Update Audit Fields
    const userName = req.user?.name || req.user?.username || "System";
    payload.updated_by = req.user?._id || null;
    payload.updated_by_name = userName;

    // Append update history
    const historyEntry = {
      action: "Updated Equipment Details",
      changed_by: req.user?._id || null,
      changed_by_name: userName,
      timestamp: new Date(),
      remarks: payload.edit_remarks || "Details updated",
    };

    payload.$push = { history: historyEntry };
    delete payload.history;
    delete payload.edit_remarks;

    const updated = await ITUnifiedAsset.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("assigned_to", "name first_name last_name username email department designation")
      .populate("vendor", "vendor_name contact_person phone email");

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error(`Error updating unified asset: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── QUICK ASSIGN TO USER ─────────────────────────────────────────────────────
router.put("/:id/quick-assign", validateId, async (req, res) => {
  try {
    const { userId, userName, department, location, remarks } = req.body;
    if (!userId) {
      return res.status(422).json({ success: false, message: "User selection is required." });
    }

    const asset = await ITUnifiedAsset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    let resolvedName = userName || "";
    if (userId && !resolvedName) {
      const u = await User.findById(userId).select("first_name last_name username").lean();
      if (u) {
        resolvedName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
      }
    }

    asset.assigned_to = userId;
    asset.assigned_to_name = resolvedName;
    if (department) asset.department = department;
    if (location) asset.location = location;
    asset.assigned_date = new Date();
    asset.lifecycle_status = "Assigned";

    asset.history.push({
      action: `Assigned to ${resolvedName || "User"}`,
      changed_by: req.user?._id || null,
      changed_by_name: req.user?.name || req.user?.username || "System",
      timestamp: new Date(),
      remarks: remarks || `Allocated to ${resolvedName} in ${department || "Department"}`,
    });

    await asset.save();
    res.json({ success: true, data: asset, message: `Successfully assigned to ${userName}` });
  } catch (err) {
    logger.error(`Error assigning unified asset: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── QUICK RETURN TO STOCK ───────────────────────────────────────────────────
router.put("/:id/quick-return", validateId, async (req, res) => {
  try {
    const { stockType = "Old", remarks = "" } = req.body;

    const asset = await ITUnifiedAsset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const previousUser = asset.assigned_to_name || "Employee";

    asset.assigned_to = null;
    asset.assigned_to_name = "";
    asset.assigned_date = null;
    asset.lifecycle_status = "In Stock";
    asset.stock_type = stockType;

    asset.history.push({
      action: `Returned to Stock from ${previousUser}`,
      changed_by: req.user?._id || null,
      changed_by_name: req.user?.name || req.user?.username || "System",
      timestamp: new Date(),
      remarks: remarks || `Returned to inventory as ${stockType} stock`,
    });

    await asset.save();
    res.json({ success: true, data: asset, message: "Successfully returned to stock inventory." });
  } catch (err) {
    logger.error(`Error returning unified asset to stock: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── QUICK STATUS CHANGE ──────────────────────────────────────────────────────
router.put("/:id/quick-status", validateId, async (req, res) => {
  try {
    const { lifecycle_status, remarks = "" } = req.body;
    if (!lifecycle_status) {
      return res.status(422).json({ success: false, message: "Status is required." });
    }

    const asset = await ITUnifiedAsset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const oldStatus = asset.lifecycle_status;
    asset.lifecycle_status = lifecycle_status;

    asset.history.push({
      action: `Status changed from "${oldStatus}" to "${lifecycle_status}"`,
      changed_by: req.user?._id || null,
      changed_by_name: req.user?.name || req.user?.username || "System",
      timestamp: new Date(),
      remarks: remarks || `Status transitioned to ${lifecycle_status}`,
    });

    await asset.save();
    res.json({ success: true, data: asset, message: `Status updated to ${lifecycle_status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE ASSET ─────────────────────────────────────────────────────────────
router.delete("/:id", validateId, async (req, res) => {
  try {
    const item = await ITUnifiedAsset.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    res.json({ success: true, message: "Equipment record deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── EXPORT EXCEL ─────────────────────────────────────────────────────────────
router.get("/export/excel", async (req, res) => {
  try {
    const { status, stock_type, category, search } = req.query;
    const filter = {};

    if (status && status !== "ALL") filter.lifecycle_status = status;
    if (stock_type && stock_type !== "ALL") filter.stock_type = stock_type;
    if (category && category !== "ALL") filter.category = category;
    if (search && String(search).trim()) {
      const searchRegex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { asset_tag: searchRegex },
        { serial_number: searchRegex },
        { asset_name: searchRegex },
        { brand: searchRegex },
        { model: searchRegex },
        { assigned_to_name: searchRegex },
      ];
    }

    const items = await ITUnifiedAsset.find(filter)
      .populate("assigned_to", "name first_name last_name username department")
      .populate("vendor", "vendor_name")
      .sort({ createdAt: -1 })
      .lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AlVision Exim IT Module";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("IT Asset & Inventory");

    worksheet.columns = [
      { header: "Asset Tag", key: "asset_tag", width: 16 },
      { header: "Asset Name", key: "asset_name", width: 22 },
      { header: "Category", key: "category", width: 18 },
      { header: "Asset Type", key: "asset_type", width: 18 },
      { header: "Brand", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 20 },
      { header: "Serial Number", key: "serial_number", width: 20 },
      { header: "Inventory Type", key: "inventory_type", width: 16 },
      { header: "Condition", key: "condition", width: 14 },
      { header: "Status", key: "lifecycle_status", width: 18 },
      { header: "Stock Type", key: "stock_type", width: 14 },
      { header: "Assigned To", key: "assigned_to_name", width: 22 },
      { header: "Department", key: "department", width: 18 },
      { header: "Location", key: "location", width: 18 },
      { header: "Processor", key: "processor", width: 18 },
      { header: "RAM", key: "ram", width: 12 },
      { header: "Storage", key: "storage", width: 16 },
      { header: "OS", key: "os", width: 14 },
      { header: "IP Address", key: "ip", width: 16 },
      { header: "Purchase Cost (₹)", key: "purchase_cost", width: 18 },
      { header: "Purchase Date", key: "purchase_date", width: 16 },
      { header: "Warranty Expiry", key: "warranty_end_date", width: 16 },
      { header: "Vendor", key: "vendor_name", width: 20 },
    ];

    // Style Header Row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    items.forEach((item) => {
      worksheet.addRow({
        asset_tag: item.asset_tag || "—",
        asset_name: item.asset_name || "—",
        category: item.category || "—",
        asset_type: item.asset_type || "—",
        brand: item.brand || "—",
        model: item.model || "—",
        serial_number: item.serial_number || "—",
        inventory_type: item.inventory_type || (item.stock_type === "New" ? "New Inventory" : "Old Inventory"),
        condition: item.condition || "Good",
        lifecycle_status: item.lifecycle_status || "—",
        stock_type: item.stock_type || "—",
        assigned_to_name: item.assigned_to_name || item.assigned_to?.name || "—",
        department: item.department || "—",
        location: item.location || "—",
        processor: item.specs?.processor || "—",
        ram: item.specs?.ram || "—",
        storage: item.specs?.storage || "—",
        os: item.specs?.operating_system || "—",
        ip: item.specs?.ip_address || "—",
        purchase_cost: item.purchase_cost || 0,
        purchase_date: item.purchase_date
          ? new Date(item.purchase_date).toLocaleDateString("en-IN")
          : "—",
        warranty_end_date: item.warranty_end_date
          ? new Date(item.warranty_end_date).toLocaleDateString("en-IN")
          : "—",
        vendor_name: item.vendor_name || item.vendor?.vendor_name || "—",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Unified_IT_Asset_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error(`Error exporting unified asset excel: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SAFE CLONE FROM LEGACY MODULES ───────────────────────────────────────────
// Reads from legacy 'itassets' and 'itinventories' without altering them
router.post("/clone-from-legacy", async (req, res) => {
  try {
    let clonedAssetsCount = 0;
    let clonedInventoryCount = 0;
    let skippedCount = 0;

    // 1. Clone from legacy ITAsset
    const legacyAssets = await Asset.find({}).populate("assigned_to", "name username department").lean();

    for (const la of legacyAssets) {
      if (!la.asset_tag) continue;
      const existing = await ITUnifiedAsset.findOne({ asset_tag: la.asset_tag.trim() });
      if (existing) {
        skippedCount++;
        continue;
      }

      let category = "Other";
      if (["Desktop", "Computer"].includes(la.asset_type)) category = "Computer";
      else if (la.asset_type === "Laptop") category = "Laptop";
      else if (la.asset_type === "Printer") category = "Printer";
      else if (la.asset_type === "Monitor") category = "Monitor";
      else if (la.asset_type === "Network Device") category = "Network Device";
      else if (la.asset_type === "Software") category = "Software";
      else if (["Phone", "SIM Card"].includes(la.asset_type)) category = "Mobile Device";
      else if (la.asset_type === "Rack") category = "Rack";
      else if (la.asset_type === "Cable") category = "Cable";
      else if (la.asset_type === "Peripheral") category = "Peripheral";

      let lifecycle_status = "In Stock";
      if (la.assigned_to) {
        lifecycle_status = "Assigned";
      } else if (["In Repair", "Repair", "repair", "Under Maintenance"].includes(la.status)) {
        lifecycle_status = "Under Maintenance";
      } else if (["Spare", "spare"].includes(la.status)) {
        lifecycle_status = "Spare";
      } else if (["Retired", "Lost"].includes(la.status)) {
        lifecycle_status = "Retired";
      }

      await ITUnifiedAsset.create({
        asset_tag: la.asset_tag.trim(),
        serial_number: la.serial_number || "",
        asset_name: la.asset_name || `${la.manufacturer || ""} ${la.model || ""}`.trim() || la.asset_type,
        category,
        asset_type: la.asset_type || category,
        brand: la.manufacturer || "",
        model: la.model || "",
        lifecycle_status,
        inventory_type: "Old Inventory",
        condition: "Good",
        stock_type: "Old",
        assigned_to: la.assigned_to?._id || la.assigned_to || null,
        assigned_to_name: la.assigned_to?.name || "",
        assigned_date: la.assigned_date || null,
        department: la.department || "",
        location: la.location || "",
        specs: {
          processor: la.processor || "",
          ram: la.ram || "",
          storage: la.storage || "",
          operating_system: la.operating_system || "",
          ip_address: la.ip_address || "",
          mac_address: la.mac_address || "",
          imei_number: la.imei_number || "",
          sim_number: la.sim_number_iccid || "",
          service_provider: la.service_provider || "",
        },
        vendor: la.vendor || null,
        purchase_cost: la.purchase_cost || 0,
        purchase_date: la.purchase_date || null,
        invoice_number: la.invoice_number || "",
        invoice_date: la.invoice_date || null,
        warranty_end_date: la.warranty_expiry || null,
        image_url: la.image_url || "",
        approval_stage: "Completed",
        origin_source: "Cloned_Asset",
        legacy_ref_id: la._id,
        remarks: "Cloned from legacy Asset Management",
      });
      clonedAssetsCount++;
    }

    // 2. Clone from legacy ITInventory
    const legacyInventories = await Inventory.find({}).lean();

    for (const inv of legacyInventories) {
      if (!inv.item_id) continue;
      const existing = await ITUnifiedAsset.findOne({ asset_tag: inv.item_id.trim() });
      if (existing) {
        skippedCount++;
        continue;
      }

      let category = "Other";
      if (inv.category === "Computer") category = "Computer";
      else if (inv.category === "Laptop") category = "Laptop";
      else if (inv.category === "Printer") category = "Printer";
      else if (inv.category === "Monitor") category = "Monitor";
      else if (inv.category === "Server") category = "Server";
      else if (inv.category === "Network Device") category = "Network Device";
      else if (inv.category === "Mobile Device") category = "Mobile Device";
      else if (inv.category === "Software License") category = "Software License";

      await ITUnifiedAsset.create({
        asset_tag: inv.item_id.trim(),
        asset_name: `${inv.brand || ""} ${inv.model || ""}`.trim() || inv.category,
        category,
        asset_type: inv.category,
        brand: inv.brand || "",
        model: inv.model || "",
        lifecycle_status: "Available",
        inventory_type: inv.inventory_type === "New" ? "New Inventory" : "Old Inventory",
        condition: inv.condition || "Good",
        stock_type: inv.inventory_type === "New" ? "New" : "Old",
        warranty_start_date: inv.warranty_start_date || null,
        warranty_end_date: inv.warranty_end_date || null,
        approval_stage: "Completed",
        origin_source: "Cloned_Inventory",
        legacy_ref_id: inv._id,
        remarks: "Cloned from legacy Inventory Management",
      });
      clonedInventoryCount++;
    }

    res.json({
      success: true,
      message: `Cloned ${clonedAssetsCount} assets and ${clonedInventoryCount} inventory items. Skipped ${skippedCount} duplicates.`,
      data: {
        clonedAssetsCount,
        clonedInventoryCount,
        skippedCount,
      },
    });
  } catch (err) {
    logger.error(`Error cloning legacy records: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
