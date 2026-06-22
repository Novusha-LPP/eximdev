
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("Starting vendor fix process...");

try {
  // Step 1: Run the migration script
  console.log("Running vendor type migration...");
  await execAsync("node server/migrations/fix_vendor_types_simple.mjs");
  console.log("Migration completed successfully!");

  // Step 2: Restart the server
  console.log("Restarting the server...");
  await execAsync("npm restart");
  console.log("Server restarted successfully!");

  console.log("Vendor fix process completed!");
} catch (error) {
  console.error("Vendor fix process failed:", error.message);
  process.exit(1);
}
