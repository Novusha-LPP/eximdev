import mongoose from "mongoose";
import dotenv from "dotenv";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  try {
    await FleetInsuranceSopModel.collection.dropIndex("proposalNumber_1");
    console.log("Index dropped");
  } catch(e) {
    console.log(e.message);
  }
  process.exit(0);
};
run();
