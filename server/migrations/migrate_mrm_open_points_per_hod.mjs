import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import UserModel from '../model/userModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';
import OpenPointProject from '../model/openPoints/openPointProjectModel.mjs';

const isDryRun = process.argv.includes('--dry-run');

const getMongoUri = () => {
    if (process.env.NODE_ENV === 'production') return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === 'server') return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alvision';
};

async function runMigration() {
    console.log(`=======================================================`);
    console.log(`MRM Open Points: Migrate to Per-HOD Projects`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (No writes will be committed)' : 'LIVE EXECUTION'}`);
    console.log(`=======================================================`);

    const uri = getMongoUri();
    console.log(`Connecting to MongoDB (${process.env.NODE_ENV || 'development'})...`);
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.\n');

    try {
        // 1. Find the legacy "MRM Action Points" project
        console.log('--- 1. Finding legacy MRM Action Points project ---');
        const legacyProject = await OpenPointProject.findOne({
            $or: [{ name: 'MRM Action Points' }, { initials: 'MRM' }]
        });

        if (!legacyProject) {
            console.log('No legacy "MRM Action Points" project found. Nothing to migrate.');
            return;
        }
        console.log(`Found legacy project: "${legacyProject.name}" (ID: ${legacyProject._id})`);

        // 2. Find all MRM-origin OpenPoints in the legacy project
        console.log('\n--- 2. Finding MRM-origin OpenPoints ---');
        const mrmPoints = await OpenPoint.find({
            originModule: 'MRM',
            project_id: legacyProject._id
        }).lean();

        console.log(`Total MRM OpenPoints in legacy project: ${mrmPoints.length}`);

        if (mrmPoints.length === 0) {
            console.log('No MRM OpenPoints to migrate.');
            return;
        }

        // 3. Group by HOD (originContext.personId)
        console.log('\n--- 3. Grouping by HOD ---');
        const hodGroups = {};
        let orphanCount = 0;

        for (const point of mrmPoints) {
            const personId = point.originContext?.personId?.toString();
            if (!personId) {
                orphanCount++;
                continue;
            }
            if (!hodGroups[personId]) {
                hodGroups[personId] = [];
            }
            hodGroups[personId].push(point);
        }

        const hodIds = Object.keys(hodGroups);
        console.log(`Distinct HODs: ${hodIds.length}`);
        console.log(`Orphan points (no personId): ${orphanCount}`);

        // 4. For each HOD, create project and reassign points
        console.log('\n--- 4. Creating per-HOD projects and reassigning points ---');
        let totalMigrated = 0;
        let projectsCreated = 0;

        for (const hodId of hodIds) {
            const hodUser = await UserModel.findById(hodId);
            if (!hodUser) {
                console.log(`  SKIP: HOD user ${hodId} not found in User collection (${hodGroups[hodId].length} points)`);
                continue;
            }

            const firstName = (hodUser.first_name || '').trim();
            const lastName = (hodUser.last_name || '').trim();
            const fullName = `${firstName} ${lastName}`.trim() || hodUser.username;
            const projectName = `MRM - ${fullName}`;

            const firstInitial = firstName ? firstName[0].toUpperCase() : (hodUser.username ? hodUser.username[0].toUpperCase() : '');
            const lastInitial = lastName ? lastName[0].toUpperCase() : (firstName.length > 1 ? firstName[1].toUpperCase() : 'H');
            const initials = `MRM-${firstInitial}${lastInitial}`;

            // Check if per-HOD project already exists
            let hodProject = await OpenPointProject.findOne({
                $or: [{ name: projectName }, { initials }]
            });

            const pointIds = hodGroups[hodId].map(p => p._id);

            if (!hodProject) {
                console.log(`  CREATE: "${projectName}" (${initials}) for ${fullName} — ${pointIds.length} points`);

                if (!isDryRun) {
                    let deptMembers = [];
                    if (hodUser.department) {
                        deptMembers = await UserModel.find({
                            department: hodUser.department,
                            status: { $ne: 'Inactive' },
                            role: { $nin: ['driver'] }
                        }).select('_id');
                    }

                    const teamMembers = deptMembers.map(u => ({ user: u._id, role: 'L2' }));
                    if (!teamMembers.some(tm => tm.user.toString() === hodUser._id.toString())) {
                        teamMembers.push({ user: hodUser._id, role: 'L1' });
                    }

                    hodProject = await OpenPointProject.create({
                        name: projectName,
                        initials,
                        description: `Automated MRM action points for ${fullName} (${hodUser.department || 'General'}).`,
                        owner: hodUser._id,
                        status: 'Active',
                        team_members: teamMembers
                    });
                    projectsCreated++;
                }
            } else {
                console.log(`  EXISTS: "${projectName}" — reassigning ${pointIds.length} points`);
            }

            // Reassign points to HOD project
            if (!isDryRun && hodProject) {
                const result = await OpenPoint.updateMany(
                    { _id: { $in: pointIds } },
                    { $set: { project_id: hodProject._id } }
                );
                console.log(`    Reassigned ${result.modifiedCount} points`);
                totalMigrated += result.modifiedCount;
            } else {
                totalMigrated += pointIds.length;
            }
        }

        // 5. Archive legacy project if empty
        console.log('\n--- 5. Checking if legacy project is now empty ---');
        const remainingCount = isDryRun
            ? mrmPoints.length - totalMigrated + orphanCount
            : await OpenPoint.countDocuments({ project_id: legacyProject._id });

        console.log(`Remaining points in legacy project: ${remainingCount}`);

        if (remainingCount === 0 && !isDryRun) {
            await OpenPointProject.findByIdAndUpdate(legacyProject._id, {
                $set: { status: 'Archived' }
            });
            console.log(`Archived legacy "MRM Action Points" project.`);
        } else if (remainingCount > 0) {
            console.log(`Legacy project still has ${remainingCount} points (orphans or non-MRM). Keeping it active.`);
        }

        // Summary
        console.log(`\n=======================================================`);
        console.log(`Migration Summary:`);
        console.log(`  HODs processed: ${hodIds.length}`);
        console.log(`  Projects created: ${isDryRun ? `${projectsCreated} (would create)` : projectsCreated}`);
        console.log(`  Points migrated: ${isDryRun ? `${totalMigrated} (would migrate)` : totalMigrated}`);
        console.log(`  Orphan points: ${orphanCount}`);
        console.log(`=======================================================`);

    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\nMongoDB disconnected. Migration complete.');
    }
}

runMigration();
