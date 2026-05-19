/**
 * Script to remove individual geofencing settings for all users.
 * This unsets 'geo_fencing_required' and 'allowed_locations' from user attendance settings,
 * forcing the system to fall back to company-level settings.
 * 
 * Run: node server/scripts/remove_individual_geofencing.mjs
 */

import mongoose from 'mongoose';
import User from '../model/userModel.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/exim';

async function removeIndividualGeofencing() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('🚀 Searching for users with individual geofencing settings...');
        
        // Count how many users have these settings
        const count = await User.countDocuments({
            $or: [
                { 'attendance_settings.geo_fencing_required': { $exists: true } },
                { 'attendance_settings.allowed_locations': { $exists: true, $ne: [] } }
            ]
        });

        if (count === 0) {
            console.log('ℹ️ No users found with individual geofencing overrides.');
        } else {
            console.log(`📝 Found ${count} users with overrides. Proceeding to remove...`);

            const result = await User.updateMany(
                {},
                { 
                    $unset: { 
                        'attendance_settings.geo_fencing_required': "",
                        'attendance_settings.allowed_locations': ""
                    } 
                }
            );

            console.log(`✅ Successfully updated documents.`);
            console.log(`✅ Individual geofencing overrides have been removed.`);
        }

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        process.exit(0);
    }
}

removeIndividualGeofencing();
