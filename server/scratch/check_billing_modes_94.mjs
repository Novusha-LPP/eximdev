import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import JobModel from "../model/jobModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
  const uri = process.env.DEV_MONGODB_URI;
  await mongoose.connect(uri);
  
  const customHouses = [
    "ICD SANAND", "ICD KHODIYAR", "AHMEDABAD AIR CARGO", "MUNDRA PORT", "ICD SACHANA", "COCHIN SEA"
  ];

  const jobs = await JobModel.find({
    status: { $regex: /^pending$/i },
    custom_house: { $in: customHouses },
    bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] },
    $or: [
      { billing_completed_date: { $exists: false } },
      { billing_completed_date: "" },
      { billing_completed_date: null },
      {
        $and: [
          { billing_completed_date: { $exists: true, $ne: "" } },
          { dsr_queries: { $elemMatch: { select_module: "Accounts", resolved: { $ne: true } } } }
        ]
      }
    ]
  }).select("job_no custom_house mode").lean();

  console.log(`Total jobs matching the user's list: ${jobs.length}`);
  
  const breakdown = {};
  jobs.forEach(j => {
    if(!breakdown[j.custom_house]) breakdown[j.custom_house] = { total: 0, mode: {} };
    breakdown[j.custom_house].total++;
    const mode = j.mode || "MISSING";
    breakdown[j.custom_house].mode[mode] = (breakdown[j.custom_house].mode[mode] || 0) + 1;
  });

  console.log(JSON.stringify(breakdown, null, 2));

  mongoose.disconnect();
}

run().catch(console.error);
