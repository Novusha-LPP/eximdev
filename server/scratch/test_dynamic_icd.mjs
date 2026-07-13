import mongoose from "mongoose";
import dotenv from "dotenv";
import BranchModel from "../model/branchModel.mjs";
import JobModel from "../model/jobModel.mjs";
import CustomHouseModel from "../model/customHouseModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function run() {
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  console.log("Connected.");

  // Find the branch that contains INSBI6 (ICD Khodiyar)
  const branch = await BranchModel.findOne({ "ports.port_code": "INSBI6" });
  if (branch) {
    console.log(`Found branch for INSBI6: ${branch.branch_name} (${branch.branch_code})`);
    
    // Toggle is_icd to true for INSBI6 port
    let modified = false;
    for (const p of branch.ports) {
      if (p.port_code === "INSBI6") {
        p.is_icd = true;
        modified = true;
        console.log(`Set port ${p.port_name} (${p.port_code}) is_icd = true`);
      }
    }
    if (modified) {
      await branch.save();
      console.log("Branch saved successfully.");
    }
  } else {
    console.log("No branch found containing INSBI6 port.");
  }

  // Query all active branch ICD ports from the database dynamically (mapping logic test)
  const activeBranches = await BranchModel.find({ is_active: true }).lean();
  const dbIcdPorts = [];
  for (const b of activeBranches) {
    if (b.ports) {
      for (const p of b.ports) {
        if (p.is_icd) {
          dbIcdPorts.push(p);
        }
      }
    }
  }

  console.log("Dynamically loaded ICD ports from DB:");
  dbIcdPorts.forEach(p => console.log(` - ${p.port_name} (${p.port_code}) [is_icd: ${p.is_icd}]`));

  const targetICDs = dbIcdPorts.length > 0
    ? dbIcdPorts.map(p => p.port_code.toUpperCase())
    : ["INSAU6", "INJKA6", "INSBI6", "INBRC6", "INVCN6"];

  const targetNames = dbIcdPorts.length > 0
    ? dbIcdPorts.map(p => p.port_name.toUpperCase())
    : [
        "ICD SANAND",
        "ICD SACHANA",
        "ICD KHODIYAR",
        "ICD VARANAMA",
        "ICD VIROCHANNAGR"
      ];

  const job = await JobModel.findOne({ job_number: "AMD/IMP/SEA/00050/26-27" }).lean();
  if (job) {
    const getVal = (val) => (val === undefined || val === null ? "" : String(val).trim());
    const rawCH = getVal(job.custom_house).toUpperCase();
    
    // Resolve custom house
    let resolvedCustomHouseCode = getVal(job.custom_house);
    if (resolvedCustomHouseCode) {
      const chDoc = await CustomHouseModel.findOne({ 
        $or: [
          { name: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') },
          { code: new RegExp(`^${resolvedCustomHouseCode}$`, 'i') }
        ]
      }).lean();
      if (chDoc) {
        resolvedCustomHouseCode = chDoc.code;
      }
    }
    const resolvedCH = getVal(resolvedCustomHouseCode).toUpperCase();

    const isTargetICD = targetICDs.some(code => rawCH.includes(code) || resolvedCH.includes(code)) ||
                        targetNames.some(name => rawCH.includes(name) || resolvedCH.includes(name));

    console.log("Job custom_house:", job.custom_house);
    console.log("Resolved custom_house code:", resolvedCustomHouseCode);
    console.log("Matched as target ICD:", isTargetICD);
    console.log("Computed Mode of Transport:", isTargetICD ? "L" : (job.mode === "SEA" ? "S" : "A"));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
