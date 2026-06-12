import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";

const MONGODB_URI = "mongodb://localhost:27017/exim";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Find the specific job from the prompt
  const job = await JobModel.findById("69e9c04978569dc82c3785b1");
  if (job) {
    console.log("--- Target Job Details ---");
    console.log("job_number:", job.job_number);
    console.log("importer:", job.importer);
    console.log("importerURL:", job.importerURL);
    console.log("status:", job.status);
    console.log("detailed_status:", job.detailed_status);
    console.log("ie_code_no:", job.ie_code_no);
    console.log("branch_id:", job.branch_id);
    console.log("year:", job.year);
  } else {
    console.log("Target job not found in local DB.");
  }

  // Let's find all jobs with importer: "SHREE SHYAMSUNDER ALLOYS PVT. LTD."
  const allShreeJobs = await JobModel.find({ importer: /SHREE SHYAMSUNDER ALLOYS/i });
  console.log(`\nFound ${allShreeJobs.length} jobs with importer matching 'SHREE SHYAMSUNDER ALLOYS':`);
  allShreeJobs.forEach(j => {
    console.log(`- ${j.job_number}: importer='${j.importer}', importerURL='${j.importerURL}', status='${j.status}', detailed_status='${j.detailed_status}', ie_code='${j.ie_code_no}'`);
  });

  // Find jobs with missing importerURL
  const missingURLJobs = await JobModel.countDocuments({
    $or: [
      { importerURL: { $exists: false } },
      { importerURL: null },
      { importerURL: "" }
    ]
  });
  console.log(`\nJobs with missing importerURL: ${missingURLJobs}`);

  // Let's count mismatched importerURL vs formatted importer name
  const allJobs = await JobModel.find({}, { importer: 1, importerURL: 1, job_number: 1 }).lean();
  let mismatchCount = 0;
  const mismatches = [];

  allJobs.forEach(job => {
    if (!job.importer) return;
    const expectedURL = job.importer
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w&.]+/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    
    if (job.importerURL !== expectedURL) {
      mismatchCount++;
      if (mismatches.length < 30) {
        mismatches.push({
          job_number: job.job_number,
          importer: job.importer,
          currentURL: job.importerURL,
          expectedURL
        });
      }
    }
  });

  console.log(`Jobs with mismatched/unsynced importerURL: ${mismatchCount} out of ${allJobs.length} total jobs`);
  if (mismatches.length > 0) {
    console.log("Sample of mismatched jobs:");
    mismatches.forEach(m => {
      console.log(`- ${m.job_number}: '${m.importer}' => currentURL='${m.currentURL}', expectedURL='${m.expectedURL}'`);
    });
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  mongoose.disconnect();
});
