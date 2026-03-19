import mongoose from "mongoose";
import BranchModel from "./server/model/branchModel.mjs";
import dotenv from "dotenv";
dotenv.config();

const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/exim-dev";

async function checkBranches() {
  try {
    await mongoose.connect(mongoURI);
    const branches = await BranchModel.find({});
    console.log("Branches found:", JSON.stringify(branches, null, 2));
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkBranches();
