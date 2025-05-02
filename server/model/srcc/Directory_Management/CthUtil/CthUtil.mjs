import mongoose from "mongoose";

const CthSchema = new mongoose.Schema({
  hs_code: { type: String, required: true },
  level: { type: String },
  item_description: { type: String },
  unit: { type: String },
  basic_duty_sch: { type: Number },
  basic_duty_ntfn: { type: Number },
  specific_duty_rs: { type: Number },
  igst: { type: Number },
  sws_10_percent: { type: Number },
  total_duty_with_sws: { type: Number },
  total_duty_specific: { type: Number },
  pref_duty_a: { type: Number },
  import_policy: { type: String },
  non_tariff_barriers: { type: String },
  export_policy: { type: String },
    remark: { type: String },
  favourite: { type: Boolean, default: false },
}, { timestamps: true });

const CthModel = new mongoose.model("Cth", CthSchema);

export default CthModel