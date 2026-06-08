import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const secret = process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod";
const adminToken = jwt.sign({ _id: "69cbc481d44c495e5ef54664", role: "Admin", username: "uday_zope" }, secret);
const userToken = jwt.sign({ _id: "69cbc481d44c495e5ef54665", role: "User", username: "some_user" }, secret);

async function test() {
  console.log("Testing validation and security...");

  try {
    // 1. Unauthenticated request to /api/onboard-employee
    let res = await fetch("http://localhost:9006/api/onboard-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: "", last_name: "" })
    });
    console.log(`1. Unauthenticated onboard-employee: Status ${res.status} (expected 401)`);

    // 2. Unauthenticated request to /api/view-all-kycs
    res = await fetch("http://localhost:9006/api/view-all-kycs");
    console.log(`2. Unauthenticated view-all-kycs: Status ${res.status} (expected 401)`);

    // 3. User (Non-Admin) request to /api/onboard-employee (should fail with 403)
    res = await fetch("http://localhost:9006/api/onboard-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${userToken}`
      },
      body: JSON.stringify({
        first_name: "John",
        last_name: "Doe",
        email: "john@example.com",
        company: "Suraj Forwarders",
        employment_type: "Permanent"
      })
    });
    console.log(`3. User (Non-Admin) onboard-employee: Status ${res.status} (expected 403)`);

    // 4. Admin onboard-employee with blank first_name (should fail with 400)
    res = await fetch("http://localhost:9006/api/onboard-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${adminToken}`
      },
      body: JSON.stringify({
        first_name: "",
        last_name: "Singh",
        email: "test@example.com",
        company: "Suraj Forwarders",
        employment_type: "Permanent"
      })
    });
    let data = await res.json();
    console.log(`4. Admin onboard-employee with blank first_name: Status ${res.status} (expected 400). Response:`, data);

    // 5. Admin onboard-employee with invalid email (should fail with 400)
    res = await fetch("http://localhost:9006/api/onboard-employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `token=${adminToken}`
      },
      body: JSON.stringify({
        first_name: "Amit",
        last_name: "Singh",
        email: "invalid-email-format",
        company: "Suraj Forwarders",
        employment_type: "Permanent"
      })
    });
    data = await res.json();
    console.log(`5. Admin onboard-employee with invalid email: Status ${res.status} (expected 400). Response:`, data);

    // 6. Admin access to view-all-kycs (should succeed with 200)
    res = await fetch("http://localhost:9006/api/view-all-kycs", {
      headers: { "Cookie": `token=${adminToken}` }
    });
    console.log(`6. Admin view-all-kycs: Status ${res.status} (expected 200)`);

  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

test();
