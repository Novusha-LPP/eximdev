import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import axios from "axios";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod";
const PORT = process.env.PORT || 9006;
const JOB_NUMBER = "AMD/IMP/SEA/02296/26-27";

async function testSync() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Find any active Admin or standard user to generate token
    const UserModel = mongoose.model("User", new mongoose.Schema({}, { strict: false }));
    const user = await UserModel.findOne({ role: "Admin", isActive: { $ne: false } }).lean();
    if (!user) {
      console.error("No active Admin user found in DB to test sync.");
      await mongoose.disconnect();
      return;
    }

    console.log(`Generating test JWT token for user: ${user.username} (role: ${user.role})`);
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Call sync endpoint
    console.log(`Calling sync endpoint for job number: ${JOB_NUMBER}...`);
    const response = await axios.post(
      `http://localhost:${PORT}/api/scmCube/sync-imexcube-job`,
      { job_number: JOB_NUMBER },
      {
        headers: {
          Cookie: `token=${token}`,
          "Content-Type": "application/json",
        },
        validateStatus: () => true, // resolve promise for any status code
      }
    );

    console.log("HTTP Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

testSync();
