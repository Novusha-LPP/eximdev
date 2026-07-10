import mongoose from "mongoose";
import dotenv from "dotenv";
import AuthorizationRegistrationModel from "../model/authorizationRegistrationModel.mjs";
import LicenseUtilizationModel from "../model/licenseUtilizationModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://0.0.0.0:27017/exim";

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  const auth = await AuthorizationRegistrationModel.findOne({
    $or: [{ registration_no: "0831007749" }, { licence_no: "0831007749" }]
  }).lean();

  console.log("\n--- AUTHORIZATION REGISTER SUMMARY ---");
  console.log(`License No: ${auth.registration_no || auth.licence_no}`);
  console.log(`Scheme Code: ${auth.scheme_code}`);
  console.log(`Party Name: ${auth.party_name}`);
  console.log(`Import Validity: ${auth.import_validity}`);

  console.log("\n--- IMPORT DETAILS ITEMS ---");
  if (auth.import_details_array && auth.import_details_array.length > 0) {
    auth.import_details_array.forEach((item) => {
      console.log(`Item Sr: ${item.sr_no}`);
      console.log(`  Licensed Qty: ${item.qty} ${item.unit} (Licensed Total: ${item.licensed_qty})`);
      console.log(`  Licensed CIF USD: $${item.value_usd} (Licensed Total: ${item.licensed_cif_usd})`);
      console.log(`  Licensed CIF INR: Rs ${item.value_rs} (Licensed Total: ${item.licensed_cif_inr})`);
      console.log(`  Total Utilized Qty: ${item.total_utilized_qty}`);
      console.log(`  Total Utilized CIF USD: $${item.total_utilized_usd}`);
      console.log(`  Total Utilized CIF INR: Rs ${item.total_utilized_inr}`);
      console.log(`  Balance Qty: ${item.balance_qty}`);
      console.log(`  Balance CIF USD: $${item.balance_cif_usd}`);
      console.log(`  Balance CIF INR: Rs ${item.balance_cif_inr}`);
      console.log(`  Utilization: ${item.utilization_percent}%`);
    });
  } else {
    console.log("No import items found.");
  }

  console.log("\n--- STRUCTURAL UTILIZATION RECORDS (New Collection) ---");
  const records = await LicenseUtilizationModel.find({ authorization_no: "0831007749" }).lean();
  console.log(`Found ${records.length} utilization records.`);
  records.forEach((rec, i) => {
    console.log(`\nRecord #${i + 1}:`);
    console.log(`  License Sr: ${rec.license_sr}`);
    console.log(`  Job No: ${rec.job_no}`);
    console.log(`  BE No: ${rec.be_no}`);
    console.log(`  BE Date: ${rec.be_date}`);
    console.log(`  HS Code: ${rec.hs_code}`);
    console.log(`  Description: ${rec.item_description}`);
    console.log(`  Qty: ${rec.qty} ${rec.unit}`);
    console.log(`  CIF USD: $${rec.cif_usd}`);
    console.log(`  CIF INR: Rs ${rec.cif_inr}`);
    console.log(`  Exchange Rate: ${rec.exchange_rate_used}`);
  });

  console.log("\nDone!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
