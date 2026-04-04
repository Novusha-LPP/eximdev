import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import UserModel from "../model/userModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

// Use the appropriate URI from the .env file
const MONGODB_URI = process.env.PROD_MONGODB_URI;

async function migrate() {
    try {
        console.log("🚀 Starting Attendance Module Migration...");
        if (!MONGODB_URI) {
            throw new Error("MONGODB_URI not found in .env");
        }
        
        console.log("📡 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // Update all users who don't have 'Attendance' in their modules array
        // $addToSet ensures we don't add it twice if it's already there
        const result = await UserModel.updateMany(
            { modules: { $ne: "Attendance" } },
            { $addToSet: { modules: "Attendance" } }
        );

        console.log(`📊 Migration complete. Updated ${result.modifiedCount} users.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
