
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("Running vendor type migration...");

try {
  // Run the migration script
  await execAsync("node server/migrations/fix_vendor_types.mjs");
  console.log("Migration completed successfully!");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exit(1);
}
