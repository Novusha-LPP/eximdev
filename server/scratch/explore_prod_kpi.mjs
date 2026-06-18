import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Register models
import UserModel from '../model/userModel.mjs';
import KPISheet from '../model/kpi/kpiSheetModel.mjs';
import Company from '../model/attendance/Company.js';

// Define ES module directory helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

if (!MONGODB_URI) {
  console.error("PROD_MONGODB_URI is not defined in the environment variables!");
  process.exit(1);
}

async function explore() {
  try {
    console.log("Connecting to production DB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // Check if Company and Organization models exist, or get their collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log("Collections in DB:", collectionNames);

    // Count users
    const totalUsers = await UserModel.countDocuments();
    const activeUsers = await UserModel.countDocuments({ isActive: { $ne: false } });
    console.log(`Total users in DB: ${totalUsers}`);
    console.log(`Active users in DB: ${activeUsers}`);

    // Sample user fields
    const sampleUser = await UserModel.findOne({ isActive: { $ne: false } });
    if (sampleUser) {
      console.log("Sample active user fields:", Object.keys(sampleUser.toObject()));
      console.log("Sample user organization details:");
      console.log("  company:", sampleUser.company);
      console.log("  company_id:", sampleUser.company_id);
      console.log("  tenantId:", sampleUser.tenantId);
      console.log("  role:", sampleUser.role);
    }

    // Count KPI sheets
    const totalSheets = await KPISheet.countDocuments();
    console.log(`Total KPI sheets in DB: ${totalSheets}`);

    const last3Months = [
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 }
    ];

    for (const period of last3Months) {
      const count = await KPISheet.countDocuments({ year: period.year, month: period.month });
      console.log(`KPI sheets for ${period.year}-${period.month}: ${count}`);
    }

    // Group users by company / organization
    const companyGroups = await UserModel.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: "$company", count: { $sum: 1 } } }
    ]);
    console.log("Active users grouped by 'company' string field:", companyGroups);

    const tenantGroups = await UserModel.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: "$tenantId", count: { $sum: 1 } } }
    ]);
    console.log("Active users grouped by 'tenantId' field:", tenantGroups);

    const companyIdGroups = await UserModel.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: "$company_id", count: { $sum: 1 } } }
    ]);
    console.log("Active users grouped by 'company_id' field:", companyIdGroups);

    // Get company details
    const allCompanies = await Company.find({}, 'company_name company_code');
    console.log("Companies collection detail:", allCompanies);

    await mongoose.disconnect();
    console.log("Disconnected.");
  } catch (error) {
    console.error("Error during exploration:", error);
    process.exit(1);
  }
}

explore();
