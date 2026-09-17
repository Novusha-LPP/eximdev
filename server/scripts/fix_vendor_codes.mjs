import mongoose from "mongoose";
import dotenv from "dotenv";
import Vendor from "../model/it-helpdesk/vendorModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximdev";
console.log("Connecting to", uri);

await mongoose.connect(uri);

const vendorsWithoutCode = await Vendor.find({
  $or: [
    { vendor_code: { $exists: false } },
    { vendor_code: null },
    { vendor_code: "" }
  ]
});

console.log(`Found ${vendorsWithoutCode.length} vendors missing vendor_code.`);

const regex = /^VND-IT-(\d+)$/i;
const existingVendors = await Vendor.find({ vendor_code: { $regex: "^VND-IT-\\d+", $options: "i" } })
  .select("vendor_code")
  .lean();

let maxSeq = 0;
for (const v of existingVendors) {
  if (v.vendor_code) {
    const match = v.vendor_code.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
}

for (const vendor of vendorsWithoutCode) {
  maxSeq++;
  const code = `VND-IT-${String(maxSeq).padStart(3, "0")}`;
  await Vendor.updateOne({ _id: vendor._id }, { $set: { vendor_code: code } });
  console.log(`Updated vendor "${vendor.name}" with vendor_code: ${code}`);
}

await mongoose.disconnect();
console.log("Done fixing vendor codes.");
