import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.SERVER_MONGODB_URI || "mongodb://localhost:27017/eximNew";

async function migrate() {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(uri);
    console.log("Connected.");

    const db = mongoose.connection.db;

    // 1. Users
    console.log("Migrating Users...");
    const userResult = await db.collection('users').updateMany(
        { department: { $type: "array" } },
        [{ $set: { department: { $arrayElemAt: ["$department", 0] } } }]
    );
    console.log(`Updated ${userResult.modifiedCount} users.`);

    // 2. KPITemplates
    // Default collection name for model "KPITemplate" is "kpitemplates"
    console.log("Migrating KPITemplates...");
    const templateResult = await db.collection('kpitemplates').updateMany(
        { department: { $type: "array" } },
        [{ $set: { department: { $arrayElemAt: ["$department", 0] } } }]
    );
    console.log(`Updated ${templateResult.modifiedCount} templates.`);

    // 3. KPISheets
    // Default collection name for model "KPISheet" is "kpisheets"
    console.log("Migrating KPISheets...");
    const sheetResult = await db.collection('kpisheets').updateMany(
        { department: { $type: "array" } },
        [{ $set: { department: { $arrayElemAt: ["$department", 0] } } }]
    );
    console.log(`Updated ${sheetResult.modifiedCount} sheets.`);

    console.log("Migration complete.");
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
