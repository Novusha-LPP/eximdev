import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const IMEXCUBE_BASE_URL = "http://testimpexapi.impexcube.in";
const USERNAME = process.env.IMPEX_USERNAME || "APITest";
const PASSWORD = process.env.IMPEX_PASSWORD || "Api@$2026";
const COMPANY_BR_CODE = process.env.COMPANY_BR_CODE || "F94B2F92-4226-4678-855F-932DD2C45AB7";
const FYEAR = process.env.FYEAR || "2026-2027";

const JOB_NO = "AMD/IMP/SEA/00538/26-27";

async function checkJobDetails() {
  try {
    console.log("--- Step 1: Login ---");
    const loginUrl = `${IMEXCUBE_BASE_URL}/api/Authentication/login?username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&CompanyBrCode=${encodeURIComponent(COMPANY_BR_CODE)}&Fyear=${encodeURIComponent(FYEAR)}`;
    
    const loginRes = await axios.post(loginUrl, null, { headers: { accept: "*/*" } });
    const token = loginRes.data.data.accessToken;
    console.log("Login successful.");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "*/*"
    };

    // The image shows the URL with a hyphen: get-impdetails
    const url = `${IMEXCUBE_BASE_URL}/api/v1/GetJobDetails/get-impdetails`;

    console.log(`\n--- Step 2: Fetch Job Details for ${JOB_NO} ---`);
    console.log(`URL: ${url}`);
    
    // The image shows exact payload in section 5.2
    const payload = {
      "Method": "GetJobInfo",
      "User_Job_No": JOB_NO
    };
    
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      // Trying as POST first as it has a JSON body
      console.log("\nTrying as POST...");
      const res = await axios.post(url, payload, { headers });
      console.log("POST Result:", JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log("POST Failed:", err.response?.status, err.response?.data || err.message);
      
      console.log("\nTrying as GET with body (though unusual)...");
      try {
        const resGet = await axios.get(url, { headers, data: payload });
        console.log("GET Result:", JSON.stringify(resGet.data, null, 2));
      } catch (errGet) {
        console.log("GET Failed:", errGet.response?.status, errGet.response?.data || errGet.message);
      }
    }

  } catch (error) {
    console.error("Fatal Error:", error.response?.data || error.message);
  }
}

checkJobDetails();
