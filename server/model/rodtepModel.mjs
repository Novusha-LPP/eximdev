import mongoose from "mongoose";
import auditPlugin from "../plugins/auditPlugin.mjs";

const rodtepSchema = new mongoose.Schema(
  {
    sr_no: { type: Number },
    rodtep: { type: String, required: true, trim: true },
    issue_date: { type: String },
    expiry_date: { type: String },
    value_inr: { type: Number, default: 0 },
    iec_code: { type: String, trim: true },
  },
  { timestamps: true }
);

rodtepSchema.plugin(auditPlugin, { documentType: "rodtep" });

const RodtepModel = mongoose.model("rodtep", rodtepSchema);

export default RodtepModel;
