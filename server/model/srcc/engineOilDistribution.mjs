import mongoose from "mongoose";

const engineOilDistributionSchema = new mongoose.Schema({
  quantity: { type: Number },
  driver: { type: String },
  date: { type: String },
  truck_no: { type: String },
  odometer: { type: Number },
  location: { type: String },
});

const engineOilDistribution = mongoose.model(
  "engineOilDistribution",
  engineOilDistributionSchema
);
export default engineOilDistribution;
