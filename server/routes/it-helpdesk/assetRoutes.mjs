
import express from "express";
import mongoose from "mongoose";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();
router.use(authMiddleware);

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
    res.status(500).json({ success: false, message: err.message });
  }
};

router.get("/", async (req, res) => {
  try {
    const { type, status, location, assigned_to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.asset_type = type;
    if (status) filter.status = status;
    if (location) filter.location = new RegExp(location, "i");
    if (assigned_to) filter.assigned_to = assigned_to;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Asset.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/", validateAssetPayload, async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/:id", validateId, validateAssetPayload, async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/:id", validateId, async (req, res) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
