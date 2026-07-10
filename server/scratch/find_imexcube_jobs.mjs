import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
const IMEXCUBE_BASE_URL = process.env.IMEXCUBE_BASE_URL || "https://impexapi.impexcube.in";
const IMPEX_USERNAME = (process.env.IMPEX_USERNAME || "").trim();
const IMPEX_PASSWORD = (process.env.IMPEX_PASSWORD || "").trim();
const COMPANY_BR_CODE_AMD = (process.env.COMPANY_BR_CODE_AMD || "").trim() || "5456AD39-7CE7-4B73-9601-AC1C44138992";
const FYEAR = (process.env.FYEAR || "").trim();

async function fetchMultipleJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Login to IMEXCUBE
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(
      IMPEX_USERNAME
    )}&password=${encodeURIComponent(
      IMPEX_PASSWORD
    )}&CompanyBrCode=${encodeURIComponent(
      COMPANY_BR_CODE_AMD
    )}&Fyear=${encodeURIComponent(FYEAR)}`;

    const loginRes = await axios.post(loginUrl, null, { headers: { accept: "*/*" } });
    const token = loginRes.data.data.accessToken;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "*/*"
    };

    const jobsToFetch = [
      "AMD/IMP/SEA/02305/26-27",
      "AMD/IMP/AIR/00143/26-27",
      "AMD/IMP/SEA/02331/26-27",
      "AMD/IMP/SEA/02332/26-27"
    ];

    const results = {};
    for (const jobNo of jobsToFetch) {
      console.log(`Fetching details for ${jobNo}...`);
      const getJobUrl = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/get-impdetails`;
      try {
        const detailsRes = await axios({
          method: "GET",
          url: getJobUrl,
          data: {
            Method: "GetJobInfo",
            User_Job_No: jobNo
          },
          headers,
          timeout: 30000
        });
        results[jobNo] = detailsRes.data;
      } catch (err) {
        console.error(`Failed to fetch ${jobNo}:`, err.message);
      }
    }

    fs.writeFileSync("scratch/multiple_sample_responses.json", JSON.stringify(results, null, 2));
    console.log("Saved responses to scratch/multiple_sample_responses.json");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fetchMultipleJobs();
