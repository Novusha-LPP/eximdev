import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import { recalculateContainersDetention } from "../utils/detentionHelper.mjs";

dotenv.config();

const env = process.env.NODE_ENV || "development";
let dbUri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";
if (env === "production") {
  dbUri = process.env.PROD_MONGODB_URI;
} else if (env === "server") {
  dbUri = process.env.SERVER_MONGODB_URI;
}

console.log(`[RepairDetention] Environment: ${env}`);
console.log(`[RepairDetention] Connecting to DB: ${dbUri ? dbUri.replace(/\/\/.*@/, "//***@") : "undefined"}`);

async function repairDetentionDates() {
  try {
    await mongoose.connect(dbUri);
    console.log("[RepairDetention] Connected successfully.");

    // Query for jobs that have free_time > 0 and containers with arrival_date
    const query = {
      "container_nos": {
        $elemMatch: {
          arrival_date: { $exists: true, $nin: [null, ""] },
          $or: [
            { detention_from: { $exists: false } },
            { detention_from: null },
            { detention_from: "" },
            { detention_from: "NaN-NaN-NaN" },
            { detention_from: "1970-01-15" }
          ]
        }
      },
      free_time: { $gt: 0 }
    };

    const count = await JobModel.countDocuments(query);
    console.log(`[RepairDetention] Found ${count} jobs matching repair criteria.`);

    if (count === 0) {
      console.log("[RepairDetention] No jobs need repair.");
      await mongoose.disconnect();
      return;
    }

    // Use .lean() to bypass legacy document casting errors on unrelated fields
    const jobs = await JobModel.find(query)
      .select("_id job_no year container_nos free_time mode consignment_type type_of_b_e do_validity_upto_job_level")
      .lean();

    let updatedJobsCount = 0;
    let updatedContainersCount = 0;

    for (const job of jobs) {
      const { containers, do_validity_upto_job_level } = recalculateContainersDetention(
        job.container_nos,
        job.free_time,
        {
          mode: job.mode,
          consignment_type: job.consignment_type,
          type_of_b_e: job.type_of_b_e,
        }
      );

      let jobChanged = false;
      containers.forEach((c, idx) => {
        const oldDet = job.container_nos[idx]?.detention_from || "";
        const newDet = c.detention_from || "";
        if (oldDet !== newDet && newDet !== "") {
          jobChanged = true;
          updatedContainersCount++;
        }
      });

      if (jobChanged) {
        const updateSet = {
          container_nos: containers,
        };
        if (do_validity_upto_job_level) {
          updateSet.do_validity_upto_job_level = do_validity_upto_job_level;
        }

        await JobModel.updateOne({ _id: job._id }, { $set: updateSet });
        updatedJobsCount++;
      }
    }

    console.log(`[RepairDetention] Successfully updated ${updatedJobsCount} jobs and ${updatedContainersCount} containers.`);
    await mongoose.disconnect();
    console.log("[RepairDetention] Disconnected. Done.");
  } catch (err) {
    console.error("[RepairDetention] Error during repair:", err);
    process.exit(1);
  }
}

repairDetentionDates();
