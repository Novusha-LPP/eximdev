
import express from "express";
import mongoose from "mongoose";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

const isAccountsHeadUser = async (user) => {
  if (!user) return false;
  const roleStr = String(user.role || "").toLowerCase();
  if (
    roleStr.includes("sr. manager accounts") ||
    roleStr.includes("sr manager accounts") ||
    roleStr.includes("senior manager accounts") ||
    roleStr.includes("head of accounts") ||
    roleStr.includes("accounts head") ||
    roleStr.includes("accounts hod") ||
    roleStr.includes("hod accounts") ||
    roleStr.includes("head of department - accounts") ||
    roleStr.includes("accounts - head of department") ||
    roleStr.includes("accounts -head of department")
  ) {
    return true;
  }

  if (user._id) {
    try {
      const userDoc = await UserModel.findById(user._id).select("role department designation isHod").lean();
      if (userDoc) {
        const docRole = String(userDoc.role || "").toLowerCase();
        const docDesig = String(userDoc.designation || "").toLowerCase();
        const docDept = String(userDoc.department || "").toLowerCase();

        const isAccounts = docDept.includes("account") || docRole.includes("account") || docDesig.includes("account");
        const isHeadOrSrMgr =
          userDoc.isHod === true ||
          docRole.includes("head") ||
          docRole.includes("sr. manager") ||
          docRole.includes("sr manager") ||
          docRole.includes("senior manager") ||
          docRole.includes("hod") ||
          docDesig.includes("head") ||
          docDesig.includes("sr. manager") ||
          docDesig.includes("sr manager") ||
          docDesig.includes("senior manager") ||
          docDesig.includes("hod");

        if (isAccounts && isHeadOrSrMgr) {
          return true;
        }
      }
    } catch (err) {
      logger.error("Error checking isAccountsHeadUser:", err);
    }
  }

  return false;
};


const SIM_CARD_REQUIRED_FIELDS = [
  "sim_number_iccid",
  "mobile_number",
  "service_provider",
  "assigned_to",
  "department",
  "status",
  "allocation_date",
  "plan_type",
  "monthly_plan_package",
];

const COMPUTER_REQUIRED_FIELDS = [
  "asset_name",
  "manufacturer",
  "model",
  "serial_number",
  "processor",
  "ram",
  "storage",
  "operating_system",
  "assigned_to",
  "department",
  "location",
  "status",
  "purchase_date",
];

const PRINTER_REQUIRED_FIELDS = [
  "asset_name",
  "manufacturer",
  "model",
  "serial_number",
  "printer_type",
  "connection_type",
  "location",
  "assigned_to",
  "department",
  "status",
  "purchase_date",
];

const NETWORK_DEVICE_REQUIRED_FIELDS = [
  "asset_name",
  "device_category",
  "manufacturer",
  "model",
  "serial_number",
  "ip_address",
  "mac_address",
  "location",
  "status",
];

const SOFTWARE_REQUIRED_FIELDS = [
  "asset_name",
  "software_category",
  "version",
  "license_type",
  "license_key_subscription_id",
  "vendor",
  "number_of_licenses",
  "assigned_to",
  "department",
  "status",
  "purchase_date",
  "expiry_renewal_date",
];

const PHONE_REQUIRED_FIELDS = [
  "manufacturer",
  "model",
  "imei_number",
  "serial_number",
  "mobile_number",
  "assigned_to",
  "department",
  "status",
  "purchase_date",
  "location",
];

const RACK_REQUIRED_FIELDS = [
  "rack_name",
  "rack_type",
  "location",
  "rack_size_u_height",
  "manufacturer",
  "status",
  "installation_date",
];

const CABLE_REQUIRED_FIELDS = [
  "cable_name",
  "cable_type",
  "length",
  "location",
  "status",
  "purchase_date",
];

const FIELD_LABELS = {
  asset_tag: "Asset Tag",
  asset_name: "Asset Name",
  processor: "Processor",
  ram: "RAM",
  storage: "Storage",
  operating_system: "Operating System",
  printer_type: "Printer Type",
  connection_type: "Connection Type",
  sim_number_iccid: "SIM Number (ICCID)",
  mobile_number: "Mobile Number",
  imsi_number: "IMSI Number",
  puk_code: "PUK Code",
  service_provider: "Service Provider",
  assigned_to: "Assigned To",
  department: "Department",
  status: "Status",
  allocation_date: "Allocation Date",
  plan_type: "Plan Type",
  monthly_plan_package: "Monthly Plan/Package",
  remarks: "Remarks",
  imei_number: "IMEI Number",
  rack_name: "Rack Name/Number",
  rack_type: "Rack Type",
  rack_size_u_height: "Rack Size (U Height)",
  installation_date: "Installation Date",
  cable_name: "Cable Name",
  cable_type: "Cable Type",
  length: "Length",
  software_category: "Software Category",
  version: "Version",
  license_type: "License Type",
  license_key_subscription_id: "License Key / Subscription ID",
  number_of_licenses: "Number of Licenses",
  expiry_renewal_date: "Expiry/Renewal Date",
  device_category: "Device Category",
  ip_address: "IP Address",
  mac_address: "MAC Address",
};

const STATUS_NORMALIZATION_MAP = {
  active: "Active",
  assigned: "Assigned",
  available: "Available",
  "in repair": "In Repair",
  repair: "Repair",
  retired: "Retired",
  lost: "Lost",
  inactive: "Inactive",
  damaged: "Damaged",
  spare: "Spare",
  expired: "Expired",
  suspended: "Suspended",
};

const normalizeStatus = (status) => STATUS_NORMALIZATION_MAP[String(status || "").toLowerCase()] || status;
const SERVICE_PROVIDER_MAP = { airtel: "Airtel", jio: "Jio", vi: "Vi", bsnl: "BSNL" };
const normalizeServiceProvider = (sp) => SERVICE_PROVIDER_MAP[String(sp || "").toLowerCase()] || sp;

const validateId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(422).json({ success: false, message: "Invalid ID" });
  }
  next();
};

const validateAssetPayload = async (req, res, next) => {
  try {
    if (req.body.status) req.body.status = normalizeStatus(req.body.status);

    const existingAsset = req.params.id ? await Asset.findById(req.params.id) : null;
    if (req.params.id && !existingAsset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const mergedAsset = { ...(existingAsset ? existingAsset.toObject() : {}), ...req.body };
    if (mergedAsset.asset_type === "SIM Card") {
      const missingFields = SIM_CARD_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required SIM Card fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Computer" || mergedAsset.asset_type === "Desktop" || mergedAsset.asset_type === "Laptop") {
      const missingFields = COMPUTER_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required ${mergedAsset.asset_type} fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Printer") {
      const missingFields = PRINTER_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Printer fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Network Device") {
      const missingFields = NETWORK_DEVICE_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Network Device fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Software") {
      const missingFields = SOFTWARE_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Software fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Phone") {
      const missingFields = PHONE_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Phone fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Rack") {
      const missingFields = RACK_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Rack fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    if (mergedAsset.asset_type === "Cable") {
      const missingFields = CABLE_REQUIRED_FIELDS.filter((field) => {
        const value = mergedAsset[field];
        return value === undefined || value === null || value === "";
      });

      if (missingFields.length > 0) {
        return res.status(422).json({
          success: false,
          message: `Missing required Cable fields: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}`,
        });
      }
    }

    next();
  } catch (err) {
    logger.error(`Error validating asset payload: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
};

router.get("/", async (req, res) => {
  try {
    const { type, category, asset_type, status, department, location, assigned_to, search, page = 1, limit = 15, all, fromDate, toDate } = req.query;
    const filter = {};
    const selectedType = type || category || asset_type;
    if (selectedType && selectedType !== "ALL") filter.asset_type = selectedType;
    if (status && status !== "ALL") filter.status = status;
    if (department && department !== "ALL") filter.department = department;
    if (location) filter.location = new RegExp(location, "i");
    if (assigned_to) filter.assigned_to = assigned_to;
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
        { asset_tag: searchRegex },
        { asset_name: searchRegex },
        { manufacturer: searchRegex },
        { model: searchRegex },
        { serial_number: searchRegex },
        { location: searchRegex },
        { department: searchRegex },
        { operating_system: searchRegex },
        { sim_number_iccid: searchRegex },
        { mobile_number: searchRegex },
        { processor: searchRegex },
        { invoice_number: searchRegex },
      ];
    }

    if (all === "true") {
      const data = await Asset.find(filter)
        .populate("assigned_to", "username first_name last_name email name")
        .populate("vendor", "name")
        .populate("admin_verifications.user", "username first_name last_name email")
        .populate("accounts_verifications.user", "username first_name last_name email")
        .populate("workflow_history.performed_by", "username first_name last_name email")
        .populate("rejected_by", "username first_name last_name email")
        .sort({ createdAt: -1 });
      return res.json({ success: true, data });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 15);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Asset.find(filter)
        .populate("assigned_to", "username first_name last_name email name")
        .populate("vendor", "name")
        .populate("admin_verifications.user", "username first_name last_name email")
        .populate("accounts_verifications.user", "username first_name last_name email")
        .populate("workflow_history.performed_by", "username first_name last_name email")
        .populate("rejected_by", "username first_name last_name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Asset.countDocuments(filter),
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
    logger.error(`Error fetching assets: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export async function generateNextAssetTag() {
  const currentYear = new Date().getFullYear();
  const prefix = `AST-${currentYear}-`;
  const regex = new RegExp(`^AST-${currentYear}-(\\d+)$`, "i");

  const assets = await Asset.find({ asset_tag: { $regex: `^AST-${currentYear}-\\d+`, $options: "i" } })
    .select("asset_tag")
    .lean();

  let maxSeq = 0;
  for (const asset of assets) {
    if (asset.asset_tag) {
      const match = asset.asset_tag.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

router.get("/stats", async (_req, res) => {
  try {
    const [total, assigned, available, inRepair] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: "Assigned" }),
      Asset.countDocuments({ status: "Available" }),
      Asset.countDocuments({ status: "In Repair" }),
    ]);
    res.json({ success: true, data: { total, assigned, available, inRepair } });
  } catch (err) {
    logger.error(`Error fetching asset stats: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/next-tag", async (_req, res) => {
  try {
    const nextTag = await generateNextAssetTag();
    res.json({ success: true, data: { nextTag } });
  } catch (err) {
    logger.error(`Error generating next asset tag: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export function formatUserFriendlyError(err) {
  if (!err) return "An unexpected error occurred.";
  const rawMessage = String(err.message || "");
  if (err.code === 11000 || rawMessage.includes("E11000")) {
    if (err.keyValue) {
      if (err.keyValue.asset_tag) {
        return `Asset Tag '${err.keyValue.asset_tag}' already exists. Please use a unique Asset Tag.`;
      }
      if (err.keyValue.serial_number) {
        return `Serial Number '${err.keyValue.serial_number}' already exists. Please use a unique Serial Number.`;
      }
      const keys = Object.keys(err.keyValue).join(", ");
      return `An asset with this ${keys} already exists.`;
    }
    const match = rawMessage.match(/dup key:\s*\{\s*(\w+):\s*"([^"]+)"\s*\}/);
    if (match) {
      const field = match[1] === "asset_tag" ? "Asset Tag" : match[1] === "serial_number" ? "Serial Number" : match[1];
      return `${field} '${match[2]}' already exists. Please use a unique value.`;
    }
    return "An asset with this Asset Tag or identifier already exists.";
  }
  return err.message || "An unexpected error occurred.";
}

router.post("/", validateAssetPayload, async (req, res) => {
  try {
    if (!req.body.asset_tag || !String(req.body.asset_tag).trim()) {
      req.body.asset_tag = await generateNextAssetTag();
    }
    req.body.approval_stage = "First Admin Approval";
    req.body.approval_status = "Pending First Approval (shalini_arun)";
    req.body.rejection_remarks = "";
    
    const userRole = req.user?.role || "HR Admin";
    const userName = req.user?.first_name ? `${req.user.first_name} ${req.user.last_name || ""}`.trim() : (req.user?.username || "HR Admin User");

    req.body.workflow_history = [
      {
        stage: "First Admin Approval",
        action: "Submitted for First Admin Approval (shalini_arun)",
        performed_by: req.user?._id,
        performed_by_name: userName,
        performed_by_role: userRole,
        remarks: req.body.remarks || "Asset created and submitted for Admin approval.",
        timestamp: new Date(),
      }
    ];

    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    logger.error(`Error creating asset: ${err.message}`);
    const isDup = err.code === 11000 || String(err.message).includes("E11000");
    const userMsg = formatUserFriendlyError(err);
    res.status(isDup ? 409 : 500).json({ success: false, message: userMsg });
  }
});

router.put("/:id/workflow", validateId, async (req, res) => {
  try {
    const { action, remarks } = req.body;
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    const userName = req.user?.first_name ? `${req.user.first_name} ${req.user.last_name || ""}`.trim() : (req.user?.username || "System User");
    const userRole = req.user?.role || "Admin";
    const currentUsername = String(req.user?.username || "").toLowerCase().trim();

    let currentCycle = asset.approval_cycle || 1;
    if (!Array.isArray(asset.admin_verifications)) asset.admin_verifications = [];

    const hasShaliniVerified = asset.admin_verifications.some(
      (v) => String(v.username || "").toLowerCase() === "shalini_arun" && (v.approval_cycle === currentCycle || !v.approval_cycle)
    );
    const hasManuVerified = asset.admin_verifications.some(
      (v) => String(v.username || "").toLowerCase() === "manu_pillai" && (v.approval_cycle === currentCycle || !v.approval_cycle)
    );

    // Strictly enforce role-based access for workflow actions (Step 1: shalini_arun, Step 2: manu_pillai)
    if (action === "approve_admin" || action === "verify_admin" || action === "approve_first" || action === "approve_second") {
      if (!hasShaliniVerified) {
        if (currentUsername !== "shalini_arun" && currentUsername !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Permission denied: First approval must be completed by shalini_arun.",
          });
        }
      } else if (!hasManuVerified) {
        if (currentUsername !== "manu_pillai" && currentUsername !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Permission denied: Second/Final approval must be completed by manu_pillai.",
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: "Both shalini_arun and manu_pillai have already approved this asset.",
        });
      }
    }

    if (action === "reject_admin") {
      if (!hasShaliniVerified) {
        if (currentUsername !== "shalini_arun" && currentUsername !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Permission denied: Only shalini_arun can reject at the first approval stage.",
          });
        }
      } else if (!hasManuVerified) {
        if (currentUsername !== "manu_pillai" && currentUsername !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Permission denied: Only manu_pillai can reject at the final approval stage.",
          });
        }
      }
    }

    if (action === "resubmit_it") {
      if (currentUsername === "shalini_arun" || currentUsername === "manu_pillai") {
        return res.status(403).json({
          success: false,
          message: "Permission denied: Approvers cannot resubmit invoices. Only IT department users can resubmit.",
        });
      }
    }

    let updatedStage = asset.approval_stage;
    let updatedStatus = asset.approval_status;
    let rejectionRemarks = asset.rejection_remarks;
    let actionDescription = "";

    if (action === "approve_admin" || action === "verify_admin" || action === "approve_first" || action === "approve_second") {
      if (!hasShaliniVerified) {
        // Level 1 approval: shalini_arun
        updatedStage = "Second Admin Approval";
        updatedStatus = "Pending Final Approval (manu_pillai)";
        rejectionRemarks = "";
        asset.rejected_by = null;
        asset.rejected_by_name = "";
        asset.rejected_by_role = "";
        asset.rejected_at = null;
        actionDescription = remarks
          ? `First Approval by shalini_arun (${userName}, Cycle ${currentCycle}): ${remarks}`
          : `First Approval by shalini_arun (${userName}, Cycle ${currentCycle})`;

        asset.admin_verifications.push({
          user: req.user._id,
          username: req.user.username || "shalini_arun",
          name: userName,
          role: userRole,
          action: "First Admin Verified (shalini_arun)",
          remarks: remarks || "",
          approval_cycle: currentCycle,
          timestamp: new Date(),
        });
      } else {
        // Level 2 approval: manu_pillai -> Completed!
        updatedStage = "Completed";
        updatedStatus = "Completed";
        rejectionRemarks = "";
        asset.rejected_by = null;
        asset.rejected_by_name = "";
        asset.rejected_by_role = "";
        asset.rejected_at = null;
        asset.completed_at = new Date();
        actionDescription = remarks
          ? `Final Approval by manu_pillai (${userName}, Cycle ${currentCycle}): ${remarks}`
          : `Final Approval by manu_pillai (${userName}, Cycle ${currentCycle})`;

        asset.admin_verifications.push({
          user: req.user._id,
          username: req.user.username || "manu_pillai",
          name: userName,
          role: userRole,
          action: "Final Admin Verified (manu_pillai)",
          remarks: remarks || "",
          approval_cycle: currentCycle,
          timestamp: new Date(),
        });
      }
    } else if (action === "reject_admin" || action === "reject_accounts" || action === "admin_return_to_it") {
      updatedStage = "IT Correction";
      updatedStatus = "Returned to IT";
      rejectionRemarks = remarks || `Rejected by ${currentUsername === "manu_pillai" ? "manu_pillai" : "shalini_arun"}. Please correct and resubmit.`;
      actionDescription = `Rejected by ${currentUsername} — Returned to IT (Cycle ${currentCycle}): ${rejectionRemarks}`;
      asset.rejected_by = req.user._id;
      asset.rejected_by_name = userName;
      asset.rejected_by_role = userRole;
      asset.rejected_at = new Date();
    } else if (action === "resubmit_it") {
      currentCycle = (asset.approval_cycle || 1) + 1;
      asset.approval_cycle = currentCycle;
      updatedStage = "First Admin Approval";
      updatedStatus = "Pending First Approval (shalini_arun)";
      rejectionRemarks = "";
      asset.rejected_by = null;
      asset.rejected_by_name = "";
      asset.rejected_by_role = "";
      asset.rejected_at = null;
      actionDescription = `Resubmitted by IT Department (Initiated Cycle ${currentCycle})`;
      if (req.body.image_url) asset.image_url = req.body.image_url;
      if (req.body.invoice_number) asset.invoice_number = req.body.invoice_number;
      if (req.body.invoice_date) asset.invoice_date = req.body.invoice_date;
    } else {
      return res.status(400).json({ success: false, message: "Invalid workflow action" });
    }

    asset.approval_stage = updatedStage;
    asset.approval_status = updatedStatus;
    asset.rejection_remarks = rejectionRemarks;
    asset.workflow_history.push({
      stage: updatedStage,
      action: actionDescription,
      performed_by: req.user._id,
      performed_by_name: userName,
      performed_by_role: userRole,
      remarks: remarks || actionDescription,
      approval_cycle: currentCycle,
      timestamp: new Date(),
    });

    await asset.save();
    const updatedAsset = await Asset.findById(asset._id)
      .populate("assigned_to", "username first_name last_name email name")
      .populate("vendor", "name")
      .populate("admin_verifications.user", "username first_name last_name email")
      .populate("accounts_verifications.user", "username first_name last_name email")
      .populate("workflow_history.performed_by", "username first_name last_name email")
      .populate("rejected_by", "username first_name last_name email");

    res.json({ success: true, data: updatedAsset });
  } catch (err) {
    logger.error(`Error updating workflow for asset ${req.params.id}: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, validateAssetPayload, async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: asset });
  } catch (err) {
    logger.error(`Error updating asset: ${err.message}`);
    const isDup = err.code === 11000 || String(err.message).includes("E11000");
    const userMsg = formatUserFriendlyError(err);
    res.status(isDup ? 409 : 500).json({ success: false, message: userMsg });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Asset deleted" });
  } catch (err) {
    logger.error(`Error deleting asset: ${err.message}`);
    res.status(500).json({ success: false, message: formatUserFriendlyError(err) });
  }
});

export default router;
