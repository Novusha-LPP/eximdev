import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import AuthorizationRegistrationModel from "../model/authorizationRegistrationModel.mjs";
import { recalculateLicenseUtilization } from "../services/licenseUtilizationService.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // 1. Find the target job
  const jobNo = "00074";
  const job = await JobModel.findOne({
    $or: [
      { job_no: jobNo },
      { job_number: "AMD/IMP/SEA/00074/26-27" }
    ]
  });

  if (!job) {
    console.error("Job AMD/IMP/SEA/00074/26-27 not found in database!");
    process.exit(1);
  }
  console.log(`Found job: ${job.job_number || job.job_no} (ID: ${job._id})`);

  // 2. Find any authorization license belonging to AIA
  const license = await AuthorizationRegistrationModel.findOne({
    $or: [
      { party_name: /AIA/i },
      { iec_no: /AIA/i }
    ]
  });

  if (!license) {
    console.error("No authorization registration license found for party AIA!");
    // If not found, list any available licenses so we know what's in the DB
    const anyLic = await AuthorizationRegistrationModel.findOne().lean();
    if (anyLic) {
      console.log(`Using fallback license: ${anyLic.registration_no || anyLic.licence_no} for party: ${anyLic.party_name}`);
    } else {
      console.error("No licenses exist in the database at all!");
      process.exit(1);
    }
  } else {
    console.log(`Found license for AIA: ${license.registration_no || license.licence_no} (Party: ${license.party_name})`);
  }

  const selectedLicense = license || await AuthorizationRegistrationModel.findOne();
  const licenseNo = selectedLicense.registration_no || selectedLicense.licence_no;
  const licenseDate = selectedLicense.auth_date || selectedLicense.licence_date || "";
  const firstImportItem = selectedLicense.import_details_array?.[0] || {};
  const licenseSr = firstImportItem.sr_no || 1;

  console.log(`Connecting Job with License: ${licenseNo}, Date: ${licenseDate}, Item Sr No: ${licenseSr}`);

  // 3. Connect the job's description_details rows
  if (!job.description_details || job.description_details.length === 0) {
    job.description_details = [{
      description: job.description || "Connected Import Item",
      cth_no: job.cth_no || "",
      clearance_under: job.clearanceValue || "Full Duty",
      sr_no_invoice: "1",
      sr_no_lic: licenseNo,
      license_no: licenseNo,
      license_date: licenseDate,
      license_sr: licenseSr,
      quantity: parseFloat(job.gross_weight) || 100,
      unit: job.unit || "KGS",
      unit_price: "10",
      amount: "1000",
      amount_currency: "USD",
      foc_item: "No"
    }];
  } else {
    // Update the first row
    const firstRow = job.description_details[0];
    firstRow.sr_no_lic = licenseNo;
    firstRow.license_no = licenseNo;
    firstRow.license_date = licenseDate;
    firstRow.license_sr = licenseSr;
    if (!firstRow.quantity) firstRow.quantity = parseFloat(job.gross_weight) || 100;
    if (!firstRow.amount) firstRow.amount = "1000";
    if (!firstRow.amount_currency) firstRow.amount_currency = "USD";
  }

  job.markModified("description_details");
  await job.save();
  console.log("Job saved successfully!");

  // 4. Run recalculation
  console.log("Triggering license utilization recalculation...");
  await recalculateLicenseUtilization(licenseNo);
  console.log("Recalculation complete!");

  // Fetch updated license and verify
  const updatedLic = await AuthorizationRegistrationModel.findById(selectedLicense._id).lean();
  console.log("Utilization Records in License:");
  console.log(JSON.stringify(updatedLic.utilization_records, null, 2));

  console.log("Import Details Array (Balances):");
  console.log(JSON.stringify(updatedLic.import_details_array, null, 2));

  console.log("Done!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error executing script:", err);
  process.exit(1);
});
