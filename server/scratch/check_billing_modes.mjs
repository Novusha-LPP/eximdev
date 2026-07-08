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
  console.log("Connected to MongoDB");

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

  const jobs = await JobModel.find(baseQuery).select("job_no custom_house mode").lean();
  console.log(`Total jobs found: ${jobs.length}`);
  
  const modeCounts = {};
  const emptyOrNullModes = [];
  
  jobs.forEach(job => {
    const mode = job.mode || "MISSING_OR_NULL";
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    if (mode === "MISSING_OR_NULL" || (mode !== "Air" && mode !== "Sea" && mode !== "AIR" && mode !== "SEA")) {
      emptyOrNullModes.push({ job_no: job.job_no, mode: job.mode, custom_house: job.custom_house });
    }
  });

  console.log("Mode breakdown:", modeCounts);
  console.log("Jobs with missing or unusual mode:", emptyOrNullModes);

  mongoose.disconnect();
}

run().catch(console.error);
