import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const IMEXCUBE_BASE_URL = "https://impexapi.impexcube.in";
const USERNAME = "Surajadmin";
const PASSWORD = "admin@2026";
const COMPANY_BR_CODE = "5E8D2587-A7BA-49A2-B836-21C70B2AAF47";
const FYEAR = "2026-2027";
const JOB_NO = "AMD/IMP/SEA/02296/26-27r";

async function testFetch() {
  try {
    console.log("--- Login ---");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&CompanyBrCode=${encodeURIComponent(COMPANY_BR_CODE)}&Fyear=${encodeURIComponent(FYEAR)}`;
    console.log("Login URL:", loginUrl);
    const loginRes = await axios.post(loginUrl, null, { headers: { accept: "*/*" } });
    const token = loginRes.data.data.accessToken;
    console.log("Login successful. Token acquired.");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "*/*"
    };

    // Format 1: curl's format (GET request with Body)
    const urlHyphen = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/get-impdetails`;
    console.log("\n--- Testing Format 1: get-impdetails (GET with Body) ---");
    try {
      const res = await axios({
        method: "GET",
        url: urlHyphen,
        headers,
        data: {
          Method: "GetJobInfo",
          User_Job_No: JOB_NO
        }
      });
      console.log("Format 1 Result success:", res.data);
    } catch (err) {
      console.log("Format 1 Error:", err.response?.status, err.response?.data || err.message);
    }

    // Format 2: Old format (GET request with query params)
    const urlOld = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/getimpdetails`;
    console.log("\n--- Testing Format 2: getimpdetails (GET with params) ---");
    try {
      const res = await axios.get(urlOld, {
        headers,
        params: {
          Method: "GET",
          "User Job No.": JOB_NO
        }
      });
      console.log("Format 2 Result success:", res.data);
    } catch (err) {
      console.log("Format 2 Error:", err.response?.status, err.response?.data || err.message);
    }

  } catch (error) {
    console.error("Fatal Error:", error.response?.data || error.message);
  }
}

testFetch();
