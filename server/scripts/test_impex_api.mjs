   import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const IMEXCUBE_BASE_URL = "http://testimpexapi.impexcube.in";
const USERNAME = process.env.IMPEX_USERNAME || "APITest";
const PASSWORD = process.env.IMPEX_PASSWORD || "Api@$2026";
const COMPANY_BR_CODE = process.env.COMPANY_BR_CODE || "F94B2F92-4226-4678-855F-932DD2C45AB7";
const FYEAR = process.env.FYEAR || "2026-2027";

function classifyAction(response, statusCode) {
  const msg = String(response?.message || "").toLowerCase();
  const nestedMsg = String(response?.data?.[0]?.Message || response?.data?.[0]?.ErrorMsg || "").toLowerCase();
  const combined = `${msg} ${nestedMsg}`;

  if (combined.includes("updated")) return "UPDATED";
  if (statusCode === 409 || combined.includes("already exists") || combined.includes("duplicate")) {
    return "DUPLICATE";
  }
  if (response?.success) return "CREATED";
  return "FAILED";
}

function printResult(label, apiResponse, statusCode) {
  const action = classifyAction(apiResponse, statusCode);
  const jobNo = apiResponse?.data?.[0]?.JobNo || "N/A";
  const vendorMsg = apiResponse?.data?.[0]?.Message || apiResponse?.data?.[0]?.ErrorMsg || apiResponse?.message || "";

  console.log(`Result (${label}):`, action);
  console.log("HTTP:", statusCode, "success:", Boolean(apiResponse?.success));
  console.log("JobNo:", jobNo);
  console.log("Vendor Message:", vendorMsg);
}

async function runTest() {
  const timestamp = new Date().getTime();
  const uniqueJobNo = `AMD/IMP/SEA/${timestamp}`;
  const uniqueSeqNo = String(timestamp).substring(String(timestamp).length - 6);
  // YYYYMMDD format
  const today = new Date();
  const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');

  const payload = {
    "CHADetails": {
      "CHA Code": "NOVU",
      "CHA Branch Code": "NOVUAMD",
      "Financial Year": "2026-2027",
      "SenderID": "PROTRANS"
    },
    "BE_Details": {
      "Custom House Code": "INMAA4",
      "Running SequenceNo": uniqueSeqNo,
      "User Job RNo": uniqueSeqNo,
      "User Job No.": uniqueJobNo,
      "User Job Date": dateStr,
      "BE Number": "",
      "BE Date": "",
      "BE Type": "H",
      "IEC Code": "0807015555",
      "Branch Sr. No": "1",
      "Name of the importer": "NANDESHWARI STEEL LIMITED",
      "Address 1": "Test Address 2",
      "City": "AHMEDABAD",
      "State": "GUJARAT",
      "Pin": "380001",
      "Class": "N",
      "Mode of Transport": "S",
      "ImporterType": "P",
      "Kachcha BE": "N",
      "High sea sale flag": "N",
      "Port of Origin": "KRBUS",
      "CHA Code": "NOVU",
      "Country of Origin": "KR",
      "Country of Consignment": "KR",
      "Port Of Shipment": "KRBUS",
      "Green Channel Requested": "N",
      "Section 48 Requested": "N",
      "Whether Prior BE": "N",
      "Authorized Dealer Code": "6390489",
      "First Check Requested": "N",
      "No of packages released": "12",
      "Package Code": "PLT",
      "Gross Weight": "309090",
      "Unit of Measurement": "PCS",
      "Payment method code": "T"
    },
    "IGMS": [
      {
        "IGM No.": "4298675",
        "IGM Date": dateStr,
        "Inward Date": dateStr,
        "MAWB.BL No": "ONEYSELG14006700",
        "MAWB.BL Date": dateStr,
        "Total No. Of Packages": "12",
        "Gross Weight": "309090",
        "Unit Quantity Code": "KGS",
        "Package Code": "PLT",
        "Marks And Numbers 1": "AS PER BL"
      }
    ],
    "CONTAINER": [
      {
        "IGM Number": "4298675",
        "IGM Date": dateStr,
        "LCL.FCL": "F",
        "Container Number": "BMOU1577299",
        "Seal Number": "39386"
      }
    ],
    "SupportingDocumentList": []
  };

  try {
    console.log("--- Step 1: Login ---");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&CompanyBrCode=${encodeURIComponent(COMPANY_BR_CODE)}&Fyear=${encodeURIComponent(FYEAR)}`;
    const loginRes = await axios.post(loginUrl, null, { headers: { accept: "*/*" } });
    const token = loginRes.data.data.accessToken;
    console.log("Login successful.");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
    const createUrl = `${IMEXCUBE_BASE_URL}/api/v1/ImpJobCreation/CreateJob`;

    console.log(`\n--- Step 2: Test Create Job (${uniqueJobNo}) ---`);
    const res2 = await axios.post(createUrl, payload, {
      headers,
      validateStatus: () => true,
    });
    printResult("Create", res2.data, res2.status);

    console.log("\n--- Step 3: Test UPDATE (changing a field) ---");
    payload.IGMS[0]["Marks And Numbers 1"] = "Updated Marks at " + new Date().toLocaleTimeString();
    const res3 = await axios.post(createUrl, payload, {
      headers,
      validateStatus: () => true,
    });
    printResult("Resubmit", res3.data, res3.status);

  } catch (error) {
    console.error("Fatal Error:", error.response?.data || error.message);
  }
}

runTest();
