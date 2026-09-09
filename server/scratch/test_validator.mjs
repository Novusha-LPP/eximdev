import mongoose from "mongoose";
import dotenv from "dotenv";
import { validateLicenseUtilization } from "../services/licenseUtilizationService.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://0.0.0.0:27017/exim";

async function run() {
  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully!");

  // Let's mock a description_details payload
  // Case 1: Quantity exceeds balance (16167 requested vs 10 licensed)
  const descriptionDetailsExceedQty = [
    {
      license_no: "0831007749",
      license_sr: 1,
      quantity: 50, // exceeds remaining balance
      amount: "1000",
      amount_currency: "USD",
      cth_no: "73041110"
    }
  ];

  console.log("\nTesting validation with quantity = 50 (should fail as licensed qty is 10)...");
  try {
    await validateLicenseUtilization(descriptionDetailsExceedQty, null, 84, 84, "BE-9183576", "JOB-00074");
    console.log("❌ Error: Validation passed when it should have failed!");
  } catch (err) {
    console.log("✅ Success! Validation failed as expected:", err.message);
  }

  // Case 2: Quantity within balance (e.g. 5 requested vs 10 licensed, with no other jobs using it)
  // Wait, right now we have an existing job in the database utilizing 16167 (job_id: 69b12269f7e8f31b17a3fe83).
  // If we query excluding that job_id, then the balance should be 10. Let's see:
  const descriptionDetailsWithinQty = [
    {
      license_no: "0831007749",
      license_sr: 1,
      quantity: 5,
      amount: "1000",
      amount_currency: "USD",
      cth_no: "73041110"
    }
  ];

  const currentJobId = mongoose.Types.ObjectId("69b12269f7e8f31b17a3fe83");

  console.log(`\nTesting validation with quantity = 5, excluding current job: ${currentJobId} (should pass)...`);
  try {
    await validateLicenseUtilization(descriptionDetailsWithinQty, currentJobId, 84, 84, "9183576", "00074");
    console.log("✅ Success! Validation passed as expected.");
  } catch (err) {
    console.log("❌ Error: Validation failed when it should have passed:", err.message);
  }

  // Case 3: Value exceeds balance
  const descriptionDetailsExceedValue = [
    {
      license_no: "0831007749",
      license_sr: 1,
      quantity: 5,
      amount: "50000", // exceeds $37063.73
      amount_currency: "USD",
      cth_no: "73041110"
    }
  ];

  console.log("\nTesting validation with USD amount = 50000 (should fail as licensed value is $37063.73)...");
  try {
    await validateLicenseUtilization(descriptionDetailsExceedValue, currentJobId, 84, 84, "9183576", "00074");
    console.log("❌ Error: Validation passed when it should have failed!");
  } catch (err) {
    console.log("✅ Success! Validation failed as expected:", err.message);
  }

  console.log("\nDone!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
