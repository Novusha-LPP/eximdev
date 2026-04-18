import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * PRODUCTION-READY MIGRATION SCRIPT: Ahmedabad Spelling Fix
 * 
 * Goal:
 * 1. Fix "AMEMDABAD" and "AHEMDABAD" misspellings.
 * 2. Set Branch Name to "AHMEDABAD".
 * 3. Set Port Name and Job Custom House to "AHMEDABAD AIR CARGO".
 * 4. Normalize mixed-case "Ahmedabad Air Cargo" to uppercase.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables (ensures correct DB URI is used)
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGODB_URI =process.env.PROD_MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
}

async function run() {
    try {
        console.log(`Connecting to: ${MONGODB_URI.split('@').pop()}...`);
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;

        const PORT_VALUE = "AHMEDABAD AIR CARGO";
        const BRANCH_VALUE = "AHMEDABAD";
        const SEARCH_REGEX = /AMEMDABAD|AHEMDABAD|Ahmedabad Air Cargo/i;

        console.log('--- Phase 1: Normalizing Branches ---');
        const branchUpdate = await db.collection('branches').updateMany(
            { 
                $or: [
                    { branch_name: { $regex: SEARCH_REGEX } },
                    { "ports.port_name": { $regex: SEARCH_REGEX } }
                ]
            },
            [
                {
                    $set: {
                        branch_name: {
                            $cond: {
                                if: { $regexMatch: { input: "$branch_name", regex: SEARCH_REGEX } },
                                then: BRANCH_VALUE,
                                else: "$branch_name"
                            }
                        },
                        ports: {
                            $map: {
                                input: "$ports",
                                as: "port",
                                in: {
                                    $mergeObjects: [
                                        "$$port",
                                        {
                                            port_name: {
                                                $cond: {
                                                    if: { $regexMatch: { input: "$$port.port_name", regex: SEARCH_REGEX } },
                                                    then: PORT_VALUE,
                                                    else: "$$port.port_name"
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]
        );
        console.log(`✅ Updated ${branchUpdate.modifiedCount} branch documents.`);

        console.log('--- Phase 2: Normalizing Job Records ---');
        const jobsUpdate = await db.collection('jobs').updateMany(
            { custom_house: { $regex: SEARCH_REGEX } },
            { $set: { custom_house: PORT_VALUE } }
        );
        console.log(`✅ Updated ${jobsUpdate.modifiedCount} job documents.`);

        console.log('--- Phase 3: Normalizing User Assignments ---');
        const usersUpdate = await db.collection('users').updateMany(
            { selected_icd_codes: { $regex: SEARCH_REGEX } },
            [
                {
                    $set: {
                        selected_icd_codes: {
                            $map: {
                                input: "$selected_icd_codes",
                                as: "code",
                                in: {
                                    $cond: {
                                        if: { $regexMatch: { input: "$$code", regex: SEARCH_REGEX } },
                                        then: PORT_VALUE,
                                        else: "$$code"
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        );
        console.log(`✅ Updated ${usersUpdate.modifiedCount} user profiles.`);

        console.log('\n✨ All migrations completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
