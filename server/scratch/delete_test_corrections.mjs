import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RegularizationRequest from '../model/attendance/RegularizationRequest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI;

async function run() {
  console.log("Connecting to production MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  const query = {
    reason: { $regex: /^test$/i }
  };

  const foundCount = await RegularizationRequest.countDocuments(query);
  console.log(`Found ${foundCount} test correction requests.`);

  if (foundCount > 0) {
    const list = await RegularizationRequest.find(query).select('_id employee_id attendance_date reason').lean();
    console.log("Details of requests to delete:", JSON.stringify(list, null, 2));

    const result = await RegularizationRequest.deleteMany(query);
    console.log(`Successfully deleted ${result.deletedCount} requests.`);
  } else {
    console.log("No test correction requests found. Nothing to delete.");
  }

  mongoose.connection.close();
}

run().catch(console.error);
