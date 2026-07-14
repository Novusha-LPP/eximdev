import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import JobModel from "../model/jobModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const buildSearchQuery = (search) => {
  return {
    $or: [
      { job_no: { $regex: search, $options: "i" } },
      { job_number: { $regex: search, $options: "i" } },
      { year: { $regex: search, $options: "i" } },
      { importer: { $regex: search, $options: "i" } },
      { custom_house: { $regex: search, $options: "i" } },
      { consignment_type: { $regex: search, $options: "i" } },
      { type_of_b_e: { $regex: search, $options: "i" } },
      { awb_bl_no: { $regex: search, $options: "i" } },
      { be_no: { $regex: search, $options: "i" } },
      { "charges.purchase_book_no": { $regex: search, $options: "i" } },
      { "charges.payment_request_no": { $regex: search, $options: "i" } },
      { detailed_status: { $regex: search, $options: "i" } },
      { "container_nos.container_number": { $regex: search, $options: "i" } },
      { "container_nos.size": { $regex: search, $options: "i" } },
      { job_owner: { $regex: search, $options: "i" } },
      { port_of_reporting: { $regex: search, $options: "i" } },
    ],
  };
};

async function run() {
  const uri = process.env.DEV_MONGODB_URI;
  await mongoose.connect(uri);

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

  const airQuery = { $and: [...baseQuery.$and, buildSearchQuery("Air")] };
  const seaQuery = { $and: [...baseQuery.$and, buildSearchQuery("Sea")] };

  const airJobs = await JobModel.find(airQuery).select("job_no mode custom_house").lean();
  const seaJobs = await JobModel.find(seaQuery).select("job_no mode custom_house").lean();
  
  const allJobs = await JobModel.find(baseQuery).select("job_no mode custom_house").lean();

  console.log(`Total Billing Pending Jobs: ${allJobs.length}`);
  console.log(`Search "Air" returned: ${airJobs.length} jobs`);
  console.log(`Search "Sea" returned: ${seaJobs.length} jobs`);

  mongoose.disconnect();
}

run().catch(console.error);
