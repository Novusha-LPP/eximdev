import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../model/userModel.mjs";

dotenv.config();
const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");
  
  const hasTyreModule = await UserModel.find({ modules: "Tyre Procurement SOP" }, "username role modules");
  console.log("USERS WITH TYRE MODULE:", JSON.stringify(hasTyreModule, null, 2));

  const admins = await UserModel.find({ role: "Admin" }, "username role modules");
  console.log("ADMINS:", JSON.stringify(admins, null, 2));
  
  await mongoose.disconnect();
}
run().catch(console.error);
