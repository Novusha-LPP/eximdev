import mongoose from "mongoose";
import dotenv from "dotenv";
import ShippingLineModel from "../model/shippingLineModel.mjs";

dotenv.config({ path: "./.env" });
const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function list() {
  await mongoose.connect(MONGODB_URI);
  const shippingLines = await ShippingLineModel.find().sort({ name: 1 });
  console.log(`Total shipping lines in DB: ${shippingLines.length}`);
  console.log("Sorted List of Shipping Lines:");
  shippingLines.forEach((s, index) => {
    console.log(`${index + 1}. ${s.name}`);
  });
  await mongoose.disconnect();
}
list();
