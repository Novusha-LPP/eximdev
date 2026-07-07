import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const uri = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function main() {
  console.log("Connecting to", uri.replace(/:([^:@]{3,})@/, ':***@'));
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const baseQuery = {
    $and: [
      { status: { $regex: /^pending$/i } },
      {
        bill_document_sent_to_accounts: {
          $exists: true,
          $nin: [null, ""],
        },
      },
      {
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
        ],
      },
    ],
  };

  const jobs = await JobModel.find(baseQuery).lean();
  
  const count = jobs.length;
  console.log("Total pending jobs:", count);
  
  const byImporter = {};
  const byCustomHouse = {};
  const byDetailedStatus = {};
  const byMode = {};
  
  jobs.forEach(job => {
      const importer = job.importer || "Unknown";
      byImporter[importer] = (byImporter[importer] || 0) + 1;
      
      const customHouse = job.custom_house || "Unknown";
      byCustomHouse[customHouse] = (byCustomHouse[customHouse] || 0) + 1;
      
      const detailedStatus = job.detailed_status || "Unknown";
      byDetailedStatus[detailedStatus] = (byDetailedStatus[detailedStatus] || 0) + 1;
      
      const mode = job.mode || "Unknown";
      byMode[mode] = (byMode[mode] || 0) + 1;
  });

  const summary = {
      totalCount: count,
      byMode,
      byImporter,
      byCustomHouse,
      byDetailedStatus
  };

  const fs = await import("fs");
  fs.writeFileSync("pending_billing_summary.json", JSON.stringify(summary, null, 2));
  console.log("Saved to pending_billing_summary.json");
  
  await mongoose.disconnect();
}

main().catch(console.error);
