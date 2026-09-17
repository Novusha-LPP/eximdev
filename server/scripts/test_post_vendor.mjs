import mongoose from "mongoose";
import dotenv from "dotenv";
import { generateNextVendorCode } from "../routes/it-helpdesk/vendorRoutes.mjs";
import Vendor from "../model/it-helpdesk/vendorModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximdev";
await mongoose.connect(uri);

const nextCode = await generateNextVendorCode();
console.log("Next auto-generated vendor_code will be:", nextCode);

await mongoose.disconnect();
