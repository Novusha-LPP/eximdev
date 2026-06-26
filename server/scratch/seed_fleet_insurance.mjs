import mongoose from "mongoose";
import dotenv from "dotenv";
import FleetInsuranceSopModel from "../model/accounts/fleetInsuranceSop.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";

const makes = ["Tata", "Ashok Leyland", "Mahindra", "Eicher", "BharatBenz"];
const types = ["Truck", "Trailer", "Tanker", "LCV", "HCV"];
const sizes = ["20 FT", "40 FT", "32 FT"];
const insurers = ["ICICI Lombard", "HDFC ERGO", "Tata AIG", "Bajaj Allianz", "New India Assurance", "SBI general Insurance"];

const generateRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB...");

    // Clear existing dummy data if any, or just add new
    await FleetInsuranceSopModel.deleteMany({});

    const dummyRecords = [];
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    for (let i = 1; i <= 100; i++) {
      const createdDate = generateRandomDate(threeMonthsAgo, now);
      
      const makeModel = makes[Math.floor(Math.random() * makes.length)];
      const modelType = types[Math.floor(Math.random() * types.length)];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      
      const registrationDate = new Date(createdDate.getTime() - Math.floor(Math.random() * 5 * 365 * 24 * 60 * 60 * 1000));
      const policyFromDate = new Date(createdDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const policyToDate = new Date(createdDate.getTime() - 1 * 24 * 60 * 60 * 1000);

      const newExpiryDate = new Date(createdDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      const oldIdv = Math.floor(500000 + Math.random() * 2500000);
      const newIdv = oldIdv - (oldIdv * 0.1); // 10% dep
      
      const isRenewed = Math.random() > 0.3 ? "YES" : "NO";

      const record = {
        srNo: i,
        registrationNo: `MH-43-${String(Math.floor(1000 + Math.random() * 9000))}`,
        registrationDate,
        makeModel,
        fromOwner: registrationDate,
        toOwner: new Date(),
        modelType,
        size,
        owner: "AlVision Transport Ltd",
        policyFromDate,
        policyToDate,
        insuranceCompany: insurers[Math.floor(Math.random() * insurers.length)],
        policyNo: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
        gvw: Math.floor(5000 + Math.random() * 20000),
        idv: oldIdv,
        premiumAmount: Math.floor(15000 + Math.random() * 30000),
        remarks: "Dummy seed data",
        ncbPercentage: Math.floor(Math.random() * 5) * 5,
        premium: Math.floor(10000 + Math.random() * 20000),
        thisYearIdv: oldIdv,
        newIdv: newIdv,
        newNcbPercentage: Math.floor(Math.random() * 5) * 5,
        rsdTaken: 0,
        imt23: 0,
        zeroDepTowingCover: Math.random() > 0.5 ? "YES" : "NO",
        premiumQuote: Math.floor(18000 + Math.random() * 25000),
        renewed: isRenewed,
        newExpiryDate: isRenewed === "YES" ? newExpiryDate : null,
        renewedDate: isRenewed === "YES" ? createdDate : null,
        createdAt: createdDate,
        updatedAt: createdDate,
      };

      dummyRecords.push(record);
    }

    for (const record of dummyRecords) {
      try {
        await FleetInsuranceSopModel.create([record], { validateBeforeSave: false });
        console.log(`Created ${record.registrationNo}`);
      } catch (err) {
        if (err.code === 11000) {
          console.log(`Duplicate skipped: ${record.registrationNo}`);
        } else {
          console.error(`Error inserting ${record.registrationNo}:`, err.message);
        }
      }
    }

    console.log(`Successfully added ${dummyRecords.length} records!`);
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed data", err);
    process.exit(1);
  }
};

seedData();
