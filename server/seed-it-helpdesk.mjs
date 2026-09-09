import mongoose from "mongoose";
import Asset from "./model/it-helpdesk/assetModel.mjs";
import Ticket from "./model/it-helpdesk/ticketModel.mjs";
import UserModel from "./model/userModel.mjs";

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://0.0.0.0:27017/eximdev";

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const user = await UserModel.findOne({});
    const userId = user?._id;

    const assets = [
      { asset_tag: "COMP-001", serial_number: "DL-12345", asset_type: "Computer", manufacturer: "Dell", model: "OptiPlex 7090", status: "Available", location: "Floor 1 Lab" },
      { asset_tag: "LAP-001", serial_number: "HP-67890", asset_type: "Laptop", manufacturer: "HP", model: "EliteBook 840", status: "Assigned", location: "User Desk" },
      { asset_tag: "MON-001", serial_number: "LG-11111", asset_type: "Monitor", manufacturer: "LG", model: "27UP850", status: "Available", location: "Store Room" },
    ];

    const tickets = [
      { ticket_id: "TK-20240609-0001", title: "Laptop not booting", description: "User reports laptop won't start", category: "Hardware", priority: "High", status: "New", type: "Incident", raised_by: userId },
      { ticket_id: "TK-20240609-0002", title: "Software install request", description: "Need Excel installed", category: "Software", priority: "Medium", status: "Assigned", type: "Service Request", raised_by: userId },
    ];

    await Asset.insertMany(assets);
    await Ticket.insertMany(tickets);

    console.log("Seed data inserted successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
};

seedData();