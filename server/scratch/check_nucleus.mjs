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
  await mongoose.connect(uri);
  
  const baseBillingQuery = {
    $and: [
      { year: "26-27" },
      { status: { $regex: "^pending$", $options: "i" } },
      { bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] } },
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
        ]
      }
    ]
  };

  const readyForBillingSeaCount = await JobModel.countDocuments({
      ...baseBillingQuery,
      mode: { $in: ["SEA", "sea", "Sea"] }
  });

  const readyForBillingAirCount = await JobModel.countDocuments({
      ...baseBillingQuery,
      mode: { $in: ["AIR", "air", "Air"] }
  });

  console.log("Nucleus logic SEA:", readyForBillingSeaCount);
  console.log("Nucleus logic AIR:", readyForBillingAirCount);

  // Without year
  const noYearQuery = JSON.parse(JSON.stringify(baseBillingQuery));
  noYearQuery.$and.shift(); // remove { year: "26-27" }

  const noYearSeaCount = await JobModel.countDocuments({
      ...noYearQuery,
      mode: { $in: ["SEA", "sea", "Sea"] }
  });

  const noYearAirCount = await JobModel.countDocuments({
      ...noYearQuery,
      mode: { $in: ["AIR", "air", "Air"] }
  });

  console.log("Without year SEA:", noYearSeaCount);
  console.log("Without year AIR:", noYearAirCount);

  await mongoose.disconnect();
}

main().catch(console.error);
