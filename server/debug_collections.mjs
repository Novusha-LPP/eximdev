import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config();

// FORCE SERVER ENV as per nodemon.json
process.env.NODE_ENV = 'server';

const MONGODB_URI = process.env.SERVER_MONGODB_URI;

console.log("Environment:", process.env.NODE_ENV);
console.log("Using URI Variable: SERVER_MONGODB_URI");
// Log masked URI
if (MONGODB_URI) {
    const parts = MONGODB_URI.split('@');
    console.log("Connecting to host:", parts.length > 1 ? parts[1].split('/')[0] : 'Unknown');
    console.log("Database path:", parts.length > 1 ? parts[1].split('/')[1]?.split('?')[0] : 'Unknown');
} else {
    console.error("SERVER_MONGODB_URI is undefined!");
    process.exit(1);
}

async function listCollections() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("\nAvailable Collections:");
        collections.forEach(c => console.log(`- ${c.name}`));

        console.log("\n--- Checking Specific Collections ---");
        const projectCount = await mongoose.connection.db.collection('openpointprojects').countDocuments();
        const pointCount = await mongoose.connection.db.collection('openpoints').countDocuments();
        const userCount = await mongoose.connection.db.collection('users').countDocuments();

        console.log(`openpointprojects count: ${projectCount}`);
        console.log(`openpoints count: ${pointCount}`);
        console.log(`users count: ${userCount}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

listCollections();
