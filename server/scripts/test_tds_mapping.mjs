import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const secret = process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod";
const adminToken = jwt.sign({ _id: "69cbc481d44c495e5ef54664", role: "Admin", username: "uday_zope" }, secret);

async function test() {
  console.log("Testing TDS Ledger Name mappings...");

  const testEntries = [
    { entryNo: "PB01/AMD/IMP/SEA/00636/25-26", expectedLedger: "TDS ON CONTRACT 94C - 1024 -2%" },
    { entryNo: "PB02/AMD/IMP/SEA/00434/26-27", expectedLedger: "TDS ON CONTRACT 94C - 1023- 1%" }
  ];

  try {
    for (const testCase of testEntries) {
      console.log(`\nFetching entry: ${testCase.entryNo}...`);
      const url = `http://localhost:9006/api/tally/purchase-entry?entry_no=${encodeURIComponent(testCase.entryNo)}`;
      
      const res = await fetch(url, {
        headers: {
          "Cookie": `token=${adminToken}`
        }
      });

      if (res.status !== 200) {
        console.error(`Error: Received status ${res.status}`);
        const text = await res.text();
        console.error(text);
        continue;
      }

      const data = await res.json();
      
      // Check if TDS ledger key matches expected
      const hasTdsKey = testCase.expectedLedger in data;
      const originalTdsKeyPresent = "TDS" in data;

      console.log(`Expected Ledger Key: "${testCase.expectedLedger}"`);
      console.log(`Ledger Key Present? ${hasTdsKey ? "✅ Yes" : "❌ No"}`);
      console.log(`Original "TDS" Key Present? ${originalTdsKeyPresent ? "❌ Yes (should not be present when TDS is > 0)" : "✅ No"}`);
      console.log(`Amount returned: ${data[testCase.expectedLedger]}`);
    }
  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

test();
