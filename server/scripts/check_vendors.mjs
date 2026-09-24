import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "../model/it-helpdesk/vendorModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximdev";
console.log("Connecting to", uri);

await mongoose.connect(uri);

const vendors = await Vendor.find({}).limit(15).lean();
console.log("Found vendors:", vendors.length);
vendors.forEach((v, idx) => {
  console.log(`${idx + 1}. Name: ${v.name} | Vendor Code: ${v.vendor_code}`);
});

await mongoose.disconnect();
