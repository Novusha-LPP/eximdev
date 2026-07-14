import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import CustomHouseModel from "../model/customHouseModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI || "mongodb://localhost:27017/eximdev";

async function debug() {
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  console.log("Connected.");

  const jobNum = "AMD/IMP/SEA/00050/26-27";
  const job = await JobModel.findOne({ job_number: jobNum }).lean();
  if (!job) {
    console.error("Job not found:", jobNum);
    await mongoose.disconnect();
    return;
  }

  console.log("Job details:");
  console.log("job_number:", job.job_number);
  console.log("custom_house:", JSON.stringify(job.custom_house));
  console.log("mode:", job.mode);

  const getVal = (val) => (val === undefined || val === null ? "" : String(val).trim());
  let resolvedCustomHouseCode = getVal(job.custom_house);
  console.log("Initial resolvedCustomHouseCode:", resolvedCustomHouseCode);

  if (resolvedCustomHouseCode) {
    // Escape regex characters for safe match if we construct a RegExp
    const escaped = resolvedCustomHouseCode.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const chDoc = await CustomHouseModel.findOne({ 
      $or: [
        { name: new RegExp(`^${escaped}$`, 'i') },
        { code: new RegExp(`^${escaped}$`, 'i') }
      ]
    }).lean();
    console.log("Found custom house doc using escaped regex:", chDoc);

    // Unescaped findOne (original code check)
    try {
      const chDocUnescaped = await CustomHouseModel.findOne({ 
        $or: [
          { name: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') },
          { code: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') }
        ]
      }).lean();
      console.log("Found custom house doc using original unescaped regex:", chDocUnescaped);
    } catch (e) {
      console.error("Original RegExp failed:", e.message);
    }
  }

  await mongoose.disconnect();
}

debug().catch(console.error);
