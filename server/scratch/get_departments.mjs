import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  await mongoose.connect(process.env.DEV_MONGODB_URI);
  const db = mongoose.connection.db;

  const counts = await db
    .collection("users")
    .aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log("Department breakdown in users collection:");
  console.table(counts);

  const assetDepts = await db
    .collection("it_unified_assets")
    .aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log("\nDepartment breakdown in it_unified_assets:");
  console.table(assetDepts);

  const legacyAssetDepts = await db
    .collection("itassets")
    .aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log("\nDepartment breakdown in legacy itassets:");
  console.table(legacyAssetDepts);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
