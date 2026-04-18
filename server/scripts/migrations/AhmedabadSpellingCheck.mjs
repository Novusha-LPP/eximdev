import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * DIAGNOSTIC SCRIPT: Pre-Migration Check
 * 
 * Run this to see how many documents will be affected by the Ahmedabad spelling fix.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGODB_URI =process.env.PROD_MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const SEARCH_REGEX = /AMEMDABAD|AHEMDABAD|Ahmedabad Air Cargo/i;
        
        console.log(`Searching for affected documents using regex: ${SEARCH_REGEX}...`);

        const branches = await db.collection('branches').countDocuments({
            $or: [
                { branch_name: { $regex: SEARCH_REGEX } },
                { "ports.port_name": { $regex: SEARCH_REGEX } }
            ]
        });
        console.log(`Branches found: ${branches}`);

        const jobs = await db.collection('jobs').countDocuments({
            custom_house: { $regex: SEARCH_REGEX }
        });
        console.log(`Jobs found: ${jobs}`);

        const users = await db.collection('users').countDocuments({
            selected_icd_codes: { $regex: SEARCH_REGEX }
        });
        console.log(`Users found: ${users}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
