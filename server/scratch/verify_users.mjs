import mongoose from "mongoose";
import axios from "axios";

// Let's test the route logic directly with MongoDB
import User from "../model/userModel.mjs";
import ITHelpdeskUser from "../model/it-helpdesk/userModel.mjs";

async function verify() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");
  
  const query = { isActive: { $ne: false }, role: { $nin: ["driver", "Driver"] } };
  const systemUsers = await User.find(query)
    .select("_id username first_name middle_name last_name email department designation employee_code role company isActive")
    .sort({ first_name: 1, username: 1 })
    .limit(1000)
    .lean();

  const formatted = systemUsers.map((u) => {
    const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ").trim();
    return {
      _id: u._id,
      name: fullName || u.username,
      username: u.username,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || "",
      department: u.department || "",
      designation: u.designation || "",
      employee_code: u.employee_code || "",
      role: u.role || "Employee",
      company: u.company || "",
      status: u.isActive === false ? "Inactive" : "Active",
    };
  });

  formatted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  console.log("Successfully formatted", formatted.length, "users.");
  console.log("Sample 3 users:", formatted.slice(0, 3));
  
  await mongoose.disconnect();
}

verify().catch(console.error);
