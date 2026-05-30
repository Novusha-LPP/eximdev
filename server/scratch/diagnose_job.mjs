import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";
import AuthorizationRegistrationModel from "../model/authorizationRegistrationModel.mjs";

const MONGODB_URI = "mongodb://localhost:27017/exim";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const branch_code = "AMD";
  const trade_type = "IMP";
  const mode = "SEA";
  const year = "26-27";
  const jobNo = "00240";

  const matchingJob = await JobModel.findOne({ 
    branch_code: branch_code.toUpperCase(),
    trade_type: trade_type.toUpperCase(),
    mode: mode.toUpperCase(), 
    year, 
    job_no: jobNo 
  });

  if (!matchingJob) {
    console.log("Job not found!");
    await mongoose.disconnect();
    return;
  }

  console.log("Job ie_code_no:", matchingJob.ie_code_no);

  const auths = await AuthorizationRegistrationModel.find({
    iec_no: matchingJob.ie_code_no
  });

  console.log(`Found ${auths.length} authorizations for IEC ${matchingJob.ie_code_no}:`);
  auths.forEach(a => {
    console.log(`- Registration No: ${a.registration_no}, Licence No: ${a.licence_no}, date: ${a.licence_date || a.auth_date || a.authorization_date || a.import_validity}`);
    console.log("  Import details:", JSON.stringify(a.import_details_array, null, 2));
  });

  // Find authorization "0831010120"
  const targetAuth = await AuthorizationRegistrationModel.findOne({
    $or: [
      { registration_no: "0831010120" },
      { licence_no: "0831010120" }
    ]
  });
  if (targetAuth) {
    console.log("\nFound target Authorization 0831010120:");
    console.log("  iec_no:", targetAuth.iec_no);
    console.log("  registration_no:", targetAuth.registration_no);
    console.log("  licence_no:", targetAuth.licence_no);
    console.log("  licence_date:", targetAuth.licence_date || targetAuth.auth_date);
    console.log("  import_details_array:", JSON.stringify(targetAuth.import_details_array, null, 2));
  } else {
    console.log("\nTarget Authorization 0831010120 NOT found in DB!");
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error running script:", err);
  mongoose.disconnect();
});
