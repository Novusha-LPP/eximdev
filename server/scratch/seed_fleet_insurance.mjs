import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clean existing data
    await FleetInsuranceSopModel.deleteMany({});
    console.log("Cleaned existing Fleet Insurance data.");

    // Create a historical record for MH01AB1234 (created 1 year ago)
    const historyDate = new Date();
    historyDate.setFullYear(historyDate.getFullYear() - 1);

    await FleetInsuranceSopModel.create({
      registrationNo: "MH01AB1234",
      owner: "Acme Logistics",
      makeModel: "Tata Prima",
      insuranceCompany: "HDFC Ergo",
      policyNo: "POL-123456789",
      premiumAmount: 45000,
      totalPolicyPremium: 50000,
      premiumQuote: 50000,
      renewed: "YES",
      createdAt: historyDate
    });

    // Create a historical record for DL01XY9876 (created 1 year ago)
    await FleetInsuranceSopModel.create({
      registrationNo: "DL01XY9876",
      owner: "Global Transporters",
      makeModel: "Ashok Leyland",
      insuranceCompany: "ICICI Lombard",
      policyNo: "POL-987654321",
      premiumAmount: 60000,
      totalPolicyPremium: 62000,
      premiumQuote: 62000,
      renewed: "YES",
      createdAt: historyDate
    });

    // Create a current record for MH01AB1234 (current month/year) showing an INCREASE (should be red)
    await FleetInsuranceSopModel.create({
      registrationNo: "MH01AB1234",
      owner: "Acme Logistics",
      makeModel: "Tata Prima",
      insuranceCompany: "HDFC Ergo",
      policyNo: "POL-123456789-R",
      premiumAmount: 50000,        // from previous totalPolicyPremium
      totalPolicyPremium: 58000,
      premiumQuote: 58000,         // > 50000, so should appear RED
      renewed: "YES",
      createdAt: new Date()
    });

    // Create a current record for DL01XY9876 (current month/year) showing a DECREASE (should be green)
    await FleetInsuranceSopModel.create({
      registrationNo: "DL01XY9876",
      owner: "Global Transporters",
      makeModel: "Ashok Leyland",
      insuranceCompany: "ICICI Lombard",
      policyNo: "POL-987654321-R",
      premiumAmount: 62000,        // from previous totalPolicyPremium
      totalPolicyPremium: 59000,
      premiumQuote: 59000,         // < 62000, so should appear GREEN
      renewed: "YES",
      createdAt: new Date()
    });

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
