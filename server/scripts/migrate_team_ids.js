/**
 * Migration Script: Populate team_id in AttendanceRecord and LeaveApplication
 * 
 * This script finds team membership for each user and updates:
 * - AttendanceRecord documents
 * - LeaveApplication documents
 * 
 * Run: node server/scripts/migrate_team_ids.js
 */

import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load .env from server directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Database connection
const MONGODB_URI = process.env.PROD_MONGODB_URI
  

async function migrateTeamIds() {
    try {
        console.log('🔌 Connecting to database...');
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env (DEV/PROD/SERVER)');
        }
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Import models dynamically
        const TeamModule = await import('../model/teamModel.mjs');
        const TeamModel = TeamModule.default;
        const AttendanceRecordModule = await import('../model/attendance/AttendanceRecord.js');
        const LeaveApplicationModule = await import('../model/attendance/LeaveApplication.js');
        const AttendanceRecord = AttendanceRecordModule.default;
        const LeaveApplication = LeaveApplicationModule.default;

        // Get all active teams
        console.log('📋 Fetching all active teams...');
        console.log('Database:', mongoose.connection.name);
        console.log('Collection name:', TeamModel.collection.name);
        
        // First try to get all teams to see what exists
        const allTeams = await TeamModel.find({});
        console.log(`Total teams in database: ${allTeams.length}`);
        
        if (allTeams.length > 0) {
            console.log('Sample team structure:', JSON.stringify(allTeams[0], null, 2));
        }
        
        // Now filter for active teams (or all if isActive doesn't exist)
        const teams = await TeamModel.find({ 
            $or: [
                { isActive: true },
                { isActive: { $exists: false } }
            ]
        });
        console.log(`✅ Found ${teams.length} teams (active or without isActive field)\n`);

        // Build user -> team mapping
        const userTeamMap = new Map();
        
        console.log('🔍 Processing team members...');
        teams.forEach((team, index) => {
            console.log(`Team ${index + 1}: ${team.name} (ID: ${team._id})`);
            console.log(`  HOD: ${team.hodUsername}`);
            console.log(`  Members array:`, team.members ? `${team.members.length} members` : 'No members array');
            
            if (team.members && Array.isArray(team.members)) {
                team.members.forEach(member => {
                    const userId = member.userId?.toString() || member.toString();
                    if (userId) {
                        console.log(`    - Adding user ${member.username || userId} to map`);
                        userTeamMap.set(userId, team._id);
                    }
                });
            }
        });

        console.log(`📊 User-Team Mapping: ${userTeamMap.size} users mapped to teams\n`);

        // Migrate AttendanceRecord
        console.log('🔄 Migrating AttendanceRecord documents...');
        let attendanceUpdated = 0;
        let attendanceBatch = 0;
        
        for (const [userId, teamId] of userTeamMap.entries()) {
            const result = await AttendanceRecord.updateMany(
                { 
                    employee_id: new mongoose.Types.ObjectId(userId),
                    team_id: { $exists: false }
                },
                { 
                    $set: { team_id: teamId }
                }
            );
            attendanceUpdated += result.modifiedCount;
            attendanceBatch++;
            
            if (attendanceBatch % 50 === 0) {
                console.log(`   Processed ${attendanceBatch} users, updated ${attendanceUpdated} records...`);
            }
        }
        
        console.log(`✅ AttendanceRecord migration complete: ${attendanceUpdated} records updated\n`);

        // Migrate LeaveApplication
        console.log('🔄 Migrating LeaveApplication documents...');
        let leaveUpdated = 0;
        let leaveBatch = 0;
        
        for (const [userId, teamId] of userTeamMap.entries()) {
            const result = await LeaveApplication.updateMany(
                { 
                    employee_id: new mongoose.Types.ObjectId(userId),
                    team_id: { $exists: false }
                },
                { 
                    $set: { team_id: teamId }
                }
            );
            leaveUpdated += result.modifiedCount;
            leaveBatch++;
            
            if (leaveBatch % 50 === 0) {
                console.log(`   Processed ${leaveBatch} users, updated ${leaveUpdated} applications...`);
            }
        }
        
        console.log(`✅ LeaveApplication migration complete: ${leaveUpdated} applications updated\n`);

        // Summary
        console.log('📈 MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════');
        console.log(`Teams found:                 ${teams.length}`);
        console.log(`Users with team assignment:  ${userTeamMap.size}`);
        console.log(`AttendanceRecords updated:   ${attendanceUpdated}`);
        console.log(`LeaveApplications updated:   ${leaveUpdated}`);
        console.log('═══════════════════════════════════════');
        console.log('✅ Migration completed successfully!\n');

        // Verification query
        console.log('🔍 Running verification queries...');
        const recordsWithTeam = await AttendanceRecord.countDocuments({ team_id: { $exists: true } });
        const recordsWithoutTeam = await AttendanceRecord.countDocuments({ team_id: { $exists: false } });
        const leavesWithTeam = await LeaveApplication.countDocuments({ team_id: { $exists: true } });
        const leavesWithoutTeam = await LeaveApplication.countDocuments({ team_id: { $exists: false } });

        console.log('\n📊 VERIFICATION RESULTS');
        console.log('═══════════════════════════════════════');
        console.log('AttendanceRecord:');
        console.log(`  With team_id:     ${recordsWithTeam}`);
        console.log(`  Without team_id:  ${recordsWithoutTeam}`);
        console.log('LeaveApplication:');
        console.log(`  With team_id:     ${leavesWithTeam}`);
        console.log(`  Without team_id:  ${leavesWithoutTeam}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        process.exit(0);
    }
}

// Run migration
migrateTeamIds();
