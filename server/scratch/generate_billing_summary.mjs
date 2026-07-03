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
  
  const jobs = await JobModel.find({
    status: { $regex: /^pending$/i },
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
  }).select("job_no custom_house importer mode").lean();

  const totalJobs = jobs.length;
  
  const customHouseCounts = {};
  const importerCounts = {};
  let airCount = 0;
  let seaCount = 0;

  jobs.forEach(j => {
    const ch = j.custom_house || "Unknown";
    customHouseCounts[ch] = (customHouseCounts[ch] || 0) + 1;
    
    const imp = j.importer || "Unknown";
    importerCounts[imp] = (importerCounts[imp] || 0) + 1;
    
    const mode = (j.mode || "").toUpperCase();
    if (mode === "AIR") {
      airCount++;
    } else {
      // Anything not explicitly AIR will be counted as SEA as per user logic
      seaCount++;
    }
  });

  const sortedCustomHouses = Object.entries(customHouseCounts).sort((a, b) => b[1] - a[1]);
  const sortedImporters = Object.entries(importerCounts).sort((a, b) => b[1] - a[1]);

  console.log("Pending Import Billing Jobs Summary");
  console.log("Based on the latest data from the Import Billing module, here is the summary of the pending jobs.\n");
  console.log("Overall Status");
  console.log(`Total Pending Jobs: ${totalJobs}`);
  console.log("Status Breakdown:");
  console.log(`Billing Pending: ${totalJobs}\n`);
  
  console.log("Breakdown by Custom House");
  console.log("Custom House\tPending Job Count");
  sortedCustomHouses.forEach(([ch, count]) => {
    console.log(`${ch}\t${count}`);
  });
  console.log("\nBreakdown by Importer");
  console.log("Here are the importers with pending billing jobs, sorted from highest to lowest volume:\n");
  console.log("Importer Name\tPending Job Count");
  sortedImporters.forEach(([imp, count]) => {
    console.log(`${imp}\t${count}`);
  });
  
  console.log("\n\nin import billing");
  console.log(`air Job Count: ${airCount}\n`);
  console.log(`and sea Job Count: ${seaCount}`);

  mongoose.disconnect();
}

run().catch(console.error);
