import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function run() {
  console.log("Connecting to database at:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // Build the identical base query as in our express route:
  const baseQuery = {
    $and: [
      { job_no: { $ne: null } },
      {
        status: {
          $regex: /^(pending|completed)$/i,
        },
      },
      {
        be_no: {
          $not: {
            $regex: "^cancelled$",
            $options: "i",
          },
        },
      },
    ],
  };

  const totalJobs = await JobModel.countDocuments(baseQuery);
  console.log("Total matching Complete/Pending non-cancelled jobs in system:", totalJobs);

  const sampleJobs = await JobModel.find(baseQuery)
    .select("job_no status be_no importer year custom_house do_completed")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  console.log("Sample jobs:");
  console.log(JSON.stringify(sampleJobs, null, 2));

  await mongoose.connection.close();
  console.log("DB connection closed.");
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
