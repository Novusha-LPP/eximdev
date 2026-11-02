import { resolveCompanyShortName, DEFAULT_COMPANY_DIRECTORY } from "../routes/accounts/tyreProcurementSop.mjs";

console.log("=== Testing Company Short Name Resolution ===");
const testCases = [
  ["SURAVIO", "SRCC"],
  ["SRCC", "SRCC"],
  ["SURAVIO CARGO CARRIERS PRIVATE LIMITED", "SRCC"],
  ["SURAJ", "SFPL"],
  ["SFPL", "SFPL"],
  ["SURAJ FORWARDERS PRIVATE LIMITED", "SFPL"],
  ["NOVUSHA", "NCS"],
  ["NCS", "NCS"],
  ["NOVUSHA CONSULTING SERVICES INDIA LLP", "NCS"],
  ["ALLUVIUM", "AISPL"],
  ["AISPL", "AISPL"],
  ["ALLUVIUM IOT SOLUTIONS PRIVATE LIMITED", "AISPL"],
  ["PARAMOUNT", "PPPL"],
  ["PPPL", "PPPL"],
  ["PARAMOUNT PROPACK PRIVATE LIMITED", "PPPL"],
  ["RABS", "RABS"],
  ["RABS INDUSTRIES INDIA PRIVATE LIMITED", "RABS"],
];

let failed = 0;
for (const [input, expected] of testCases) {
  const actual = resolveCompanyShortName(input);
  if (actual === expected) {
    console.log(`PASS: "${input}" -> "${actual}"`);
  } else {
    console.error(`FAIL: "${input}" -> expected "${expected}", got "${actual}"`);
    failed++;
  }
}

console.log("\n=== Checking Default Company Directory Directory Structure ===");
console.log(`Total default seeded companies: ${DEFAULT_COMPANY_DIRECTORY.length}`);
DEFAULT_COMPANY_DIRECTORY.forEach((c) => {
  console.log(`- ${c.shortName}: ${c.companyName}`);
  console.log(`  GSTIN: ${c.gstin} | PAN: ${c.pan}`);
  console.log(`  Email: ${c.email} | Contact: ${c.contactNumbers}`);
  console.log(`  Branches: [${c.branches.join(", ")}]`);
});

if (failed === 0) {
  console.log("\nALL COMPANY SHORT NAME AND DIRECTORY TESTS PASSED!");
} else {
  console.error(`\n${failed} TESTS FAILED.`);
  process.exit(1);
}
