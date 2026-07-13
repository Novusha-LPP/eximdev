import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import CustomHouseModel from "../model/customHouseModel.mjs";
import CountryModel from "../model/countryModel.mjs";
import PortModel from "../model/portModel.mjs";

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI || "mongodb://localhost:27017/eximNew";

const getVal = (val) => (val === undefined || val === null ? "" : String(val).trim());
const validateChar = (val, length, mandatory = false, fieldName = "") => {
  let s = getVal(val);
  if (mandatory && !s) {
    throw new Error(`Mandatory field '${fieldName}' is missing`);
  }
  return s.substring(0, length);
};

async function debug() {
  await mongoose.connect(uri);
  const job = await JobModel.findOne({ job_number: "AMD/IMP/SEA/00050/26-27" }).lean();
  
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

  const rawCH = getVal(job.custom_house).toUpperCase();
  const resolvedCH = getVal(resolvedCustomHouseCode).toUpperCase();
  const targetICDs = ["INSAU6", "INJKA6", "INSBI6", "INBRC6", "INVCN6"];
  const targetNames = [
    "ICD SANAND",
    "ICD SACHANA",
    "ICD KHODIYAR",
    "ICD VARANAMA",
    "ICD VIROCHANNAGR"
  ];
  const isTargetICD = targetICDs.some(code => rawCH.includes(code) || resolvedCH.includes(code)) ||
                      targetNames.some(name => rawCH.includes(name) || resolvedCH.includes(name));

  let mode = "";
  if (isTargetICD) {
    mode = "L";
  } else if (job.mode === "SEA") {
    mode = "S";
  } else if (job.mode === "AIR") {
    mode = "A";
  }
  const modeVal = validateChar(mode, 1, true, "Mode of Transport");

  console.log("rawCH:", rawCH);
  console.log("resolvedCH:", resolvedCH);
  console.log("isTargetICD:", isTargetICD);
  console.log("modeVal:", modeVal);

  await mongoose.disconnect();
}

debug().catch(console.error);
