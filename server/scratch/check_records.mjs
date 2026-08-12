import mongoose from "mongoose";
import dotenv from "dotenv";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";

dotenv.config();

const prodUri = process.env.PROD_MONGODB_URI;

async function run() {
  const conn = await mongoose.createConnection(prodUri).asPromise();
  console.log("Connected to PROD DB");
  const Model = conn.model("FleetInsuranceSop", FleetInsuranceSopModel.schema);

  const docs = await Model.find({}).sort({ registrationNo: 1, createdAt: 1 }).lean();
  
  console.log(`Found ${docs.length} total records:\n`);
  docs.forEach((d) => {
    console.log(`${d.registrationNo} | ID: ${d._id} | Created: ${d.createdAt ? d.createdAt.toISOString() : "old"} | PolicyNo: ${d.policyNo || "-"} | renewed: "${d.renewed}" | finAppr: "${d.financialApprovalStatus}" | UTR: "${d.paymentUtr}" | PR: "${d.prNumber}"`);
  });

  await conn.close();
}

run();
