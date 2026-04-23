import mongoose from "mongoose";
import dotenv from "dotenv";
import EmptyOffLocationModel from "./model/emptyOffLocationModel.mjs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI;

const doListOptionsAMD = [
  "ICD Khodiyar / ICD AHMEDABAD",
  "ICD SANAND",
  "CONTAINER CARE SERVICES / OCEAN EMPTY CONTAINER PARK",
  "ABHI CONTAINER SERVICES",
  "Golden Horn Container Services (Nr. ICD Khodiyar)",
  "Golden Horn Container Services (Nr. ICD SANAND)",
  "JAY BHAVANI CONTAINERS YARD",
  "BALAJI QUEST YARD",
  "SATURN GLOBAL TERMINAL PVT LTD",
  "DONOR MARINE SERVICE PVT. LTD.",
  "CHEKLA CONTAINER YARD",
  "ICD SACHANA",
  "SHREE SHIV SHAKTI EMPTY PARK LLP",
  "ANIKET ROADLINES"
];

const doListOptionsGIM = [
  "ASHTAVINAYAK ENTERPRISES",
  "CONTAINER SOLUTIONS INDIA PVT LTD",
  "EMPEZAR LOGISTICS PRIVATE LIMITED",
  "J M J CONTAINER SOLUTION",
  "JDW TERMINALS PRIVATE LIMITED",
  "KDPP Terminals",
  "KEAVY GLOBAL LOGISITC PVT LTD",
  "KIAORA EMPTY YARD",
  "KMS MONDIALLE PVT LTD",
  "KOTAK AGRO PROCESSING PVT LTD",
  "PANINDIA MARINE SERVICES PRIVATE LIMITED",
  "PERFECT CONTAINER TERMINAL",
  "PERFECT MULTIMODAL LLP",
  "SAI MARINE CONTAINER SERVICES",
  "SAMVEDA CONTAINER CARE",
  "SAMVEDA LOGISTICS RESOURCES",
  "SHREE GANESH ENTERPRISES (GIM)",
  "SIDDHI VINAYAK LOGISTICS",
  "TURK MITHANI ENTERPRISE PVT LTD",
  "UNITED FREIGHT CONTAINER TERMINAL",
  "NAVDEEP SHIPPING PVT LTD",
  "KAMI-SAMA Marine Services Pvt. Ltd",
  "D & M MARINE LOGISTICS",
  "SABARI CONTAINER TERMINAL PVT LTD.",
  "ADMEK TERMINALS PVT. LTD",
  "KK LOGISTICS AND SERVICES LLP",
  "OCEAN MEEN BOX LOGISTICS",
  "ARWA MARINE CONTAINER SERVICES",
  "JACT CONTAINER TERMINALS LLP",
  "WILL MARINE CONTAINER SERVICES PVT LTD",
  "KEJ MARINE CONTAINER SERVICE",
  "STAR TEX CONTAINER SERVICES LLP",
  "SHUBHAM NEWPORT LLP",
  "NAISHA EMPTY PARK PVT LTD.",
  "ADANI PORTS AND SPECIAL ECONOMIC ZONE LIMITED",
  "ALLCARGO TERMINALS LIMITED",
  "AMEYA LOGISTICS PVT LTD",
  "ASHUTOSH CONTAINER SERVICES PVT LTD",
  "CENTRAL WAREHOUSING CORPORATION (NEW)",
  "HIND TERMINALS PVT LTD.",
  "LANDMARK CFS PVT LTD",
  "MUNDRA INTERNATIONAL CONTAINER TERMINAL PVT LTD.",
  "MUNDHRA CONTAINER FREIGHT STATION PVT LTD.",
  "SAURASHTRA FREIGHT PVT LTD.",
  "SEABIRD MARINE SERVICES (GUJARAT) PVT. LTD.",
  "TRANSWORLD TERMINALS PVT LTD.",
  "SATURN GLOBAL TERMINAL PVT.LTD.",
  "DONOR MARINE SERVICE PVT. LTD.",
  "JAI ASHAPURA CONTAINER TERMINALS",
  "CCIS CMA CGM Inland Services India LLP"
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const allLocations = [];

    // Add AMD locations
    doListOptionsAMD.forEach(name => {
      allLocations.push({
        name: name.toUpperCase(),
        assigned_branches: ["AMD"],
        active: "YES"
      });
    });

    // Add GIM locations (some might overlap)
    doListOptionsGIM.forEach(name => {
      const existing = allLocations.find(loc => loc.name === name.toUpperCase());
      if (existing) {
        if (!existing.assigned_branches.includes("GIM")) {
          existing.assigned_branches.push("GIM");
        }
      } else {
        allLocations.push({
          name: name.toUpperCase(),
          assigned_branches: ["GIM"],
          active: "YES"
        });
      }
    });

    for (const loc of allLocations) {
      await EmptyOffLocationModel.findOneAndUpdate(
        { name: loc.name },
        loc,
        { upsert: true, new: true }
      );
    }

    console.log("Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
