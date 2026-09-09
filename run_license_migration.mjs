
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("Starting license migration process...");

try {
  // Step 1: Run the migration script
  console.log("Running license migration...");
  await execAsync("node server/migrations/add_license_fields.mjs");
  console.log("Migration completed successfully!");

  // Step 2: Restart the server
  console.log("Restarting the server...");
  await execAsync("npm restart");
  console.log("Server restarted successfully!");

  console.log("License migration process completed!");
} catch (error) {
  console.error("License migration process failed:", error.message);
  process.exit(1);
}
