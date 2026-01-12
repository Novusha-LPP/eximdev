import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., 'job_no_2024'
  seq: { type: Number, default: 0 },
});

const Counter = createDynamicModel("Counter", counterSchema);
export default Counter;
