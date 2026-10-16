import mongoose from "mongoose";
import User from "../model/userModel.mjs";
import ITHelpdeskUser from "../model/it-helpdesk/userModel.mjs";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");
  const query = { isActive: { $ne: false }, role: { $nin: ["driver", "Driver"] } };
  const systemUsers = await User.find(query)
    .select("_id username first_name middle_name last_name email department designation employee_code role company")
    .sort({ first_name: 1, username: 1 })
    .limit(1000)
    .lean();

  const formatted = systemUsers.map((u) => {
    const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ").trim();
    return {
      _id: u._id,
      name: fullName || u.username,
      username: u.username,
      email: u.email || "",
      department: u.department || "",
      designation: u.designation || "",
      employee_code: u.employee_code || ""
    };
  });

  formatted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  console.log("Total formatted active users:", formatted.length);
  console.log("First 5:", JSON.stringify(formatted.slice(0, 5), null, 2));
  console.log("Users with department count:", formatted.filter(u => u.department).length);
  await mongoose.disconnect();
}

run().catch(console.error);
