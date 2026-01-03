
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OpenPointProject from './model/openPoints/openPointProjectModel.mjs';
import User from './model/userModel.mjs';
import fs from 'fs';

dotenv.config();
process.env.NODE_ENV = 'server';
const MONGODB_URI = process.env.SERVER_MONGODB_URI;

const logFile = 'debug_output.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function debugPopulate() {
    fs.writeFileSync(logFile, 'Starting Debug\n');
    try {
        await mongoose.connect(MONGODB_URI);
        log("Connected to MongoDB");

        log("--- Testing User Fetch ---");
        const users = await User.find({}).limit(5);
        log(`Found ${users.length} users.`);
        if (users.length > 0) log(`Sample User: ${users[0].username} (${users[0]._id})`);

        log("\n--- Testing Project Populate ---");
        const projects = await OpenPointProject.find({});
        log(`Found ${projects.length} projects.`);

        if (projects.length > 0 && users.length > 0) {
            const p = projects[0];
            const u = users[0];
            log(`\nAttempting to add user ${u.username} to project ${p.name}...`);

            p.team_members.push({ user: u._id, role: 'L2' });
            const saved = await p.save();
            log("Save function returned.");

            const updated = await OpenPointProject.findById(p._id).populate('team_members.user', 'username');
            log(`Updated Team Members Count: ${updated.team_members.length}`);
            log(`Updated Team Members: ${JSON.stringify(updated.team_members.map(tm => tm.user ? tm.user.username : 'NULL'))}`);
        } else {
            log("No projects or users found to test addition.");
        }

    } catch (error) {
        log(`Error: ${error.message}`);
    } finally {
        await mongoose.disconnect();
    }
}

debugPopulate();
