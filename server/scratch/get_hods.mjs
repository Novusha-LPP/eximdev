import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  await mongoose.connect(process.env.DEV_MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Users with isHod: true
  const hodUsers = await db
    .collection("users")
    .find(
      { isHod: true },
      {
        projection: {
          username: 1,
          name: 1,
          first_name: 1,
          last_name: 1,
          department: 1,
          role: 1,
          designation: 1,
          email: 1,
          isActive: 1,
        },
      }
    )
    .toArray();

  console.log(`Users with isHod: true (Count: ${hodUsers.length}):`);
  console.table(
    hodUsers.map((u) => ({
      ID: u._id,
      Username: u.username,
      Name: u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim(),
      Department: u.department,
      Designation: u.designation,
      Role: u.role,
      Active: u.isActive,
    }))
  );

  // 2. Users referenced as hod_id by other users
  const distinctHodIds = await db.collection("users").distinct("hod_id");
  const validHodIds = distinctHodIds.filter((id) => id);
  console.log(`\nDistinct hod_id referenced by employees (Count: ${validHodIds.length}):`);

  const referencedHods = await db
    .collection("users")
    .find({ _id: { $in: validHodIds } })
    .project({ username: 1, name: 1, first_name: 1, last_name: 1, department: 1, isHod: 1 })
    .toArray();
  console.table(
    referencedHods.map((u) => ({
      ID: u._id,
      Username: u.username,
      Name: u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim(),
      Department: u.department,
      isHodField: u.isHod,
    }))
  );

  // 3. Count employees reporting under each HOD
  const reportsCount = await db
    .collection("users")
    .aggregate([
      { $match: { hod_id: { $ne: null } } },
      { $group: { _id: "$hod_id", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log("\nEmployee Reporting Count per HOD:");
  console.table(reportsCount);

  // 4. Any users with 'HOD' or 'Head' in designation/role
  const textHods = await db
    .collection("users")
    .find({
      $or: [
        { designation: { $regex: /hod|head of/i } },
        { role: { $regex: /hod|head of/i } },
      ],
    })
    .project({ username: 1, name: 1, designation: 1, role: 1, isHod: 1, department: 1 })
    .toArray();
  console.log(`\nUsers matching HOD/Head in designation or role (Count: ${textHods.length}):`);
  console.table(textHods);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
