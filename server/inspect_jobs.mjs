import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "./model/jobModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI;

async function checkJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const airJobs = await JobModel.find({ mode: "AIR" }).limit(5);
    console.log("AIR Jobs found:", airJobs.length);
    airJobs.forEach(job => {
      console.log(`ID: ${job._id}, job_no: "${job.job_no}", job_number: "${job.job_number}", year: "${job.year}"`);
    });

    const seaJobs = await JobModel.find({ mode: "SEA", job_no: "00001" }).limit(5);
    console.log("\nSEA Jobs with job_no '00001':", seaJobs.length);
    seaJobs.forEach(job => {
      console.log(`ID: ${job._id}, job_no: "${job.job_no}", job_number: "${job.job_number}", year: "${job.year}"`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
}

checkJobs();
