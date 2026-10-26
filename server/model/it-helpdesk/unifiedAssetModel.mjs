import mongoose from "mongoose";
import auditPlugin from "../../plugins/auditPlugin.mjs";

const LIFECYCLE_STATUS_ENUM = [
  "Available",
  "In Use",
  "Under Repair",
  "Under Maintenance",
  "Damaged",
  "Lost",
  "Disposed",
  "Returned",
  // Backward compatibility with legacy/earlier records:
  "In Stock",
  "Assigned",
  "Spare",
  "Retired",
  "Lost/Stolen",
];

const INVENTORY_TYPE_ENUM = ["Old Inventory", "New Inventory"];

const CONDITION_ENUM = ["Good", "Fair", "Damaged", "Non-Functional"];

const STOCK_TYPE_ENUM = ["New", "Old", "Refurbished"];

const CATEGORY_ENUM = [
  "Computer",
  "Computer / Desktop",
  "Laptop",
  "Printer",
  "Monitor",
  "Server",
  "Network Device",
  "Mobile Device",
  "Software License",
  "Software",
  "Rack",
  "Cable",
  "Peripheral",
  "Other",
];

const unifiedAssetSchema = new mongoose.Schema(
  {
    asset_tag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    serial_number: {
      type: String,
      trim: true,
      default: "",
    },
    asset_name: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
      enum: CATEGORY_ENUM,
      index: true,
    },
    asset_type: {
      type: String,
      trim: true,
      default: "",
    },
    brand: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    lifecycle_status: {
      type: String,
      required: true,
      enum: LIFECYCLE_STATUS_ENUM,
      default: "Available",
      index: true,
    },
    inventory_type: {
      type: String,
      enum: INVENTORY_TYPE_ENUM,
      default: "Old Inventory",
      index: true,
    },
    condition: {
      type: String,
      enum: CONDITION_ENUM,
      default: "Good",
      index: true,
    },
    stock_type: {
      type: String,
      enum: STOCK_TYPE_ENUM,
      default: "New",
      index: true,
    },

    // ─── Assignment & Organization ─────────────────────────
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assigned_to_name: {
      type: String,
      trim: true,
      default: "",
    },
    assigned_date: {
      type: Date,
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },

    // ─── Technical Specifications (Common & Dynamic) ────────
    specs: {
      processor: { type: String, trim: true, default: "" },
      cpu_cores: { type: String, trim: true, default: "" },
      ram: { type: String, trim: true, default: "" },
      storage: { type: String, trim: true, default: "" },
      storage_type: { type: String, trim: true, default: "" },
      storage_capacity: { type: String, trim: true, default: "" },
      total_storage: { type: String, trim: true, default: "" },
      raid_config: { type: String, trim: true, default: "" },
      operating_system: { type: String, trim: true, default: "" },
      hostname: { type: String, trim: true, default: "" },
      server_role: { type: String, trim: true, default: "" },
      screen_size: { type: String, trim: true, default: "" },
      resolution: { type: String, trim: true, default: "" },
      warranty_duration: { type: String, trim: true, default: "" },
      printer_type: { type: String, trim: true, default: "" },
      color_mono: { type: String, trim: true, default: "" },
      print_technology: { type: String, trim: true, default: "" },
      connectivity: { type: String, trim: true, default: "" },
      print_count: { type: String, trim: true, default: "" },
      device_type: { type: String, trim: true, default: "" },
      firmware_version: { type: String, trim: true, default: "" },
      management_ip: { type: String, trim: true, default: "" },
      port_count: { type: String, trim: true, default: "" },
      poe_support: { type: String, trim: true, default: "" },
      poe_budget: { type: String, trim: true, default: "" },
      uplink_port: { type: String, trim: true, default: "" },
      rack_cabinet: { type: String, trim: true, default: "" },
      form_factor: { type: String, trim: true, default: "" },
      ip_address: { type: String, trim: true, default: "" },
      mac_address: { type: String, trim: true, default: "" },
      imei_number: { type: String, trim: true, default: "" },
      imei_2: { type: String, trim: true, default: "" },
      sim_number: { type: String, trim: true, default: "" },
      service_provider: { type: String, trim: true, default: "" },
      software_name: { type: String, trim: true, default: "" },
      version: { type: String, trim: true, default: "" },
      license_type: { type: String, trim: true, default: "" },
      license_key: { type: String, trim: true, default: "" },
      seat_count: { type: String, trim: true, default: "" },
      custom_notes: { type: String, trim: true, default: "" },
    },

    // ─── Procurement, Financials & Vendor ──────────────────
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ItVendor",
      default: null,
    },
    vendor_name: {
      type: String,
      trim: true,
      default: "",
    },
    purchase_cost: {
      type: Number,
      default: 0,
    },
    purchase_date: {
      type: Date,
      default: null,
    },
    invoice_number: {
      type: String,
      trim: true,
      default: "",
    },
    invoice_date: {
      type: Date,
      default: null,
    },
    payment_mode: {
      type: String,
      trim: true,
      default: "UPI",
    },
    invoice_url: {
      type: String,
      trim: true,
      default: "",
    },
    warranty_start_date: {
      type: Date,
      default: null,
    },
    warranty_end_date: {
      type: Date,
      default: null,
      index: true,
    },

    // ─── Multi-Tier Invoice Verification & Approval Workflow ──
    approval_stage: {
      type: String,
      enum: [
        "First Admin Approval",
        "Second Admin Approval",
        "IT Correction",
        "Completed",
        "Rejected",
        "N/A",
      ],
      default: "Completed",
      index: true,
    },
    approval_status: {
      type: String,
      default: "N/A - Existing Inventory",
      index: true,
    },
    assigned_first_approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    first_approver_username: {
      type: String,
      trim: true,
      default: "shalini_arun",
    },
    first_approver_name: {
      type: String,
      trim: true,
      default: "Shalini Arun",
    },
    approval_cycle: {
      type: Number,
      default: 1,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    rejection_remarks: {
      type: String,
      trim: true,
      default: "",
    },
    rejected_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejected_by_name: {
      type: String,
      default: "",
    },
    rejected_by_role: {
      type: String,
      default: "",
    },
    rejected_at: {
      type: Date,
      default: null,
    },
    admin_verifications: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        username: String,
        name: String,
        role: String,
        action: { type: String, default: "First Admin Verified" },
        remarks: { type: String, default: "" },
        approval_cycle: { type: Number, default: 1 },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    workflow_history: [
      {
        stage: String,
        action: String,
        performed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        performed_by_name: String,
        performed_by_role: String,
        remarks: String,
        approval_cycle: { type: Number, default: 1 },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // ─── Traceability & History ────────────────────────────
    origin_source: {
      type: String,
      enum: ["Direct", "Cloned_Asset", "Cloned_Inventory", "Procurement"],
      default: "Direct",
    },
    procurement_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProcurementRequest",
      default: null,
      index: true,
    },
    procurement_ref: {
      type: String,
      trim: true,
      default: "",
    },
    legacy_ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    image_url: {
      type: String,
      trim: true,
      default: "",
    },
    // ─── Audit Fields (Recommendation 7) ───────────────────
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    created_by_name: {
      type: String,
      default: "",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by_name: {
      type: String,
      default: "",
    },

    history: [
      {
        action: { type: String, required: true },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changed_by_name: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-speed compound indexes for fast listing, search, and tab switching
unifiedAssetSchema.index({ lifecycle_status: 1, createdAt: -1 });
unifiedAssetSchema.index({ category: 1, lifecycle_status: 1 });
unifiedAssetSchema.index({ assigned_to: 1, lifecycle_status: 1 });
unifiedAssetSchema.index({ inventory_type: 1, lifecycle_status: 1 });
unifiedAssetSchema.index({ condition: 1 });
unifiedAssetSchema.index({ warranty_end_date: 1 });

unifiedAssetSchema.plugin(auditPlugin, { documentType: "ITUnifiedAsset" });

export default mongoose.model("ITUnifiedAsset", unifiedAssetSchema, "it_unified_assets");
