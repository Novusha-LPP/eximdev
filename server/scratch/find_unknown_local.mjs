import { MongoClient, ObjectId } from "mongodb";

const uri = "mongodb://localhost:27017/exim";

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const targetCompanyId = new ObjectId("69cd1351ff5301f416796cec");

    const company = await db.collection("companies")
      .findOne({ _id: targetCompanyId }, { projection: { company_name: 1, name: 1 } });

    const companyUsers = await db.collection("users")
      .find({ company_id: targetCompanyId })
      .project({ first_name: 1, last_name: 1, username: 1, email: 1, employee_code: 1, company_id: 1, department_id: 1 })
      .toArray();

    const namelessUsers = await db.collection("users")
      .find({
        first_name: { $in: [null, ""] },
        last_name: { $in: [null, ""] },
        username: { $in: [null, ""] },
        $or: [
          { company_id: { $in: [null, ""] } },
          { company_id: { $exists: false } },
        ],
      })
      .project({ first_name: 1, last_name: 1, username: 1, email: 1, employee_code: 1, company_id: 1, department_id: 1 })
      .toArray();

    const allUsers = await db.collection("users")
      .find({})
      .project({ first_name: 1, last_name: 1, username: 1 })
      .toArray();

    const knownUserIds = new Set(allUsers.map((user) => String(user._id)));
    const orphanAttendance = await db.collection("attendancerecords")
      .find({ employee_id: { $exists: true, $ne: null } })
      .project({ employee_id: 1, attendance_date: 1, status: 1, company_id: 1 })
      .toArray();

    const missingReferences = orphanAttendance.filter((record) => !knownUserIds.has(String(record.employee_id)));

    console.log(JSON.stringify({
      company,
      companyUsers,
      namelessUsers,
      missingReferences,
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
