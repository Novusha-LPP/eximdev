import mongoose from "mongoose";
import dotenv from "dotenv";
import ProcurementRequest from "../model/it-helpdesk/procurementModel.mjs";
import ItVendor from "../model/it-helpdesk/vendorModel.mjs";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  await mongoose.connect(process.env.DEV_MONGODB_URI || "mongodb://127.0.0.1:27017/exim");
  const vendor = (await ItVendor.findOne({ vendor_code: "VND-IT-001" })) || (await ItVendor.findOne());
  if (vendor) {
    const res = await ProcurementRequest.updateOne(
      { pr_number: "PR-2026-008" },
      {
        $set: {
          "final_approval.selected_vendor": vendor.name,
          "final_approval.selected_vendor_id": vendor._id,
          "purchase_order.vendor_name": vendor.name,
          "purchase_order.po_amount": 25000,
          "invoice_details.vendor_name": vendor.name,
          "invoice_details.vendor_id": vendor._id,
          "invoice_details.gstin": vendor.gst_number || "24AAECB4165A1Z9",
          "invoice_details.invoice_amount": 25000,
        },
      }
    );
    console.log("PR-2026-008 updated successfully with vendor:", vendor.name, "GSTIN:", vendor.gst_number);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
