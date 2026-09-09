import mongoose from "mongoose";

const otherDutiesNotificationSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      default: "C",
      immutable: true
    },
    notn_no: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    notn_sno: {
      type: String,
      default: "N/A",
      trim: true,
      index: true
    },
    duty_head: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    }, // SP EXD, CHCESS, TTA, CESS, CAIDC, EAIDC, CUS EDC, CUS HEC, NCD, AGGR
    cth_code: {
      type: String,
      trim: true,
      default: "ALL",
      index: true
    },
    current_rate: {
      type: Number,
      default: 0
    },
    rate_type: {
      type: String,
      enum: ["PERCENTAGE", "SPECIFIC"],
      default: "PERCENTAGE"
    },
    unit: {
      type: String,
      default: "%",
      trim: true
    },
    current_duty_flag: {
      type: String,
      default: "",
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    coo: {
      type: String,
      default: "ALL",
      trim: true
    },
    compliance_tags: {
      type: [String],
      default: []
    },
    rate_history: [
      {
        rate: { type: Number, required: true },
        rate_type: { type: String, default: "PERCENTAGE" },
        unit: { type: String, default: "%" },
        duty_flag: { type: String, default: "" },
        observed_from: { type: Date, default: Date.now },
        observed_till: { type: Date },
        source_boe_no: { type: String },
        source_job_no: { type: String },
        remarks: { type: String, default: "" }
      }
    ],
    has_rate_variance: {
      type: Boolean,
      default: false,
      index: true
    },
    variance_status: {
      type: String,
      enum: ["STABLE", "AMENDED_VERIFIED", "CONFLICT_FLAGGED"],
      default: "STABLE",
      index: true
    },
    is_auto_harvested: {
      type: Boolean,
      default: false
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true
    },
    usage_count: {
      type: Number,
      default: 1
    },
    last_used_in_job: {
      type: String,
      default: ""
    },
    last_used_date: {
      type: Date,
      default: Date.now
    },
    source_job_refs: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

// Compound unique index
otherDutiesNotificationSchema.index(
  { notn_no: 1, notn_sno: 1, duty_head: 1, cth_code: 1 },
  { unique: true }
);

const OtherDutiesNotificationModel = mongoose.model(
  "OtherDutiesNotification",
  otherDutiesNotificationSchema
);

export default OtherDutiesNotificationModel;
