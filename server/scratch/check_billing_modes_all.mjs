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

  const jobs = await JobModel.find({
    detailed_status: "Billing Pending",
    status: { $regex: /^pending$/i }
  }).select("job_no mode").lean();

  console.log(`Total Billing Pending jobs: ${jobs.length}`);
  
  const modeCounts = {};
  jobs.forEach(job => {
    const mode = job.mode || "MISSING_OR_NULL";
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
  });

  console.log("Mode breakdown:", modeCounts);

  // also test the exact same query but without the mode grouping, just finding those not AIR or SEA
  const missingModeJobs = jobs.filter(j => j.mode !== "AIR" && j.mode !== "SEA" && j.mode !== "Air" && j.mode !== "Sea");
  console.log("Jobs without Air/Sea mode count:", missingModeJobs.length);
  if(missingModeJobs.length > 0) {
     console.log("Sample:", missingModeJobs.slice(0, 5));
  }

  mongoose.disconnect();
}

run().catch(console.error);
