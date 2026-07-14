import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HolidayPolicy from '../model/attendance/HolidayPolicy.js';
import Shift from '../model/attendance/Shift.js';

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const holidays = await HolidayPolicy.find({}).select('policy_name company_id').lean();
    console.log("=== HOLIDAY POLICIES ===");
    console.log(holidays);

    const shifts = await Shift.find({}).select('shift_name company_id').lean();
    console.log("=== SHIFTS ===");
    console.log(shifts);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
