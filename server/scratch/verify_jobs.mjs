import dotenv from 'dotenv';
import mongoose from 'mongoose';
import JobModel from '../model/jobModel.mjs';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function verify() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB.");

    // Find jobs that have license_no containing "32"
    const jobs = await JobModel.find({
      "description_details.license_no": /32/
    }).lean();

    console.log(`Found ${jobs.length} jobs.`);
    jobs.forEach(j => {
      console.log(`Job ID: ${j._id}, Job No: ${j.job_no}, Job Number: ${j.job_number}`);
      j.description_details.forEach((row, idx) => {
        if (row.license_no && row.license_no.includes("32")) {
          console.log(`- Row ${idx+1}: License: ${row.license_no}, SR: ${row.license_sr}, Qty: ${row.quantity}, Amt: ${row.amount}`);
        }
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
