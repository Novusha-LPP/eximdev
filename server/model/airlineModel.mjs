import mongoose from "mongoose";

const airlineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  prefix: { type: String, trim: true },
  checkDigit: { type: String, default: "Yes" },
  accountNo: { type: String, default: "" },
  homePageUrl: { type: String, default: "" },
  trackingUrl: { type: String, default: "" },
  active: { type: String, default: "Yes" },
  awbFormat: { type: String, default: "" },
  created_at: { type: Date, default: Date.now },
});

const AirlineModel = mongoose.model("Airline", airlineSchema);
export default AirlineModel;
