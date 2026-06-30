import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import XLSX from "xlsx";
import jwt from "jsonwebtoken";
import TyreProcurementSop from "../model/accounts/tyreProcurementSop.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

// Custom binary parser for supertest to prevent zip corruption
const binaryParser = (res, callback) => {
  res.setEncoding("binary");
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    callback(null, Buffer.from(data, "binary"));
  });
};

async function runExportTest() {
  console.log("Connecting to database...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  }

  // 1. Find the test record
  let record = await TyreProcurementSop.findOne({ prNumber: "TEST-TYRE-9999" });
  if (!record) {
    console.log("Test record not found. Creating it...");
    record = new TyreProcurementSop({
      prNumber: "TEST-TYRE-9999",
      status: "Draft",
      stage1: {
        preparedBy: "Verification Agent",
        contactNumber: "+91 00000 00000"
      }
    });
    await record.save();
  }

  // 2. Generate a valid Admin JWT token for bypass
  const token = jwt.sign(
    { _id: "6a2bb38ff9c7a55975a46633", username: "VerifyAgent", role: "Admin" },
    process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod",
    { expiresIn: "1h" }
  );

  console.log(`Hitting export API for ID: ${record._id}...`);
  const response = await request(app)
    .get(`/api/tyre-procurement/${record._id}/export`)
    .set("Cookie", `token=${token}`)
    .parse(binaryParser)
    .expect(200);

  console.log("Export request succeeded!");
  
  // 3. Parse binary buffer
  const buffer = response.body;
  const workbook = XLSX.read(buffer, { type: "buffer" });
  
  console.log("Generated Workbook Sheets:", workbook.SheetNames);
  
  const expectedSheets = [
    "1. Purchase Request",
    "2. Supplier Quotation",
    "3. Finance Approval",
    "4. Payment & UTR",
    "5. Order & Dispatch",
    "6. Goods Received Note"
  ];
  
  let valid = true;
  expectedSheets.forEach((name) => {
    if (!workbook.SheetNames.includes(name)) {
      console.error(`Missing expected sheet: ${name}`);
      valid = false;
    }
  });

  if (valid && workbook.SheetNames.length === expectedSheets.length) {
    console.log("SUCCESS: All 6 sheets are present with correct names!");
  } else {
    console.error("FAILURE: Sheets count or naming mismatch.");
    process.exit(1);
  }

  // 4. Test template download
  console.log("Hitting template download API...");
  const tempResponse = await request(app)
    .get("/api/tyre-procurement/template/download")
    .set("Cookie", `token=${token}`)
    .parse(binaryParser)
    .expect(200);

  const tempWorkbook = XLSX.read(tempResponse.body, { type: "buffer" });
  console.log("Template Workbook Sheets:", tempWorkbook.SheetNames);

  // 5. Clean up DB record
  console.log("Cleaning up test records from database...");
  await TyreProcurementSop.deleteMany({ prNumber: "TEST-TYRE-9999" });

  await mongoose.disconnect();
  console.log("Verification finished successfully!");
}

runExportTest().catch((err) => {
  console.error("Export test failed:", err);
  process.exit(1);
});
