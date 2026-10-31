/**
 * Backfill KPI permissions for existing HODs and Admins.
 *
 * The non-submitters list only includes users whose kpi_permissions contain "assign".
 * HODs should be viewers and admins should be managers, so neither should keep "assign".
 *
 * Who is updated:
 *   - Admin  -> ensure "manage", remove "assign"
 *   - HOD    -> ensure "view",   remove "assign"
 *   A user is an HOD when role is HOD / Head_of_Department, isHod is true,
 *   or they are hodId on a team. Admin wins if someone is both.
 *   Users with no KPI module and no kpi_permissions are left unchanged.
 *   Inactive users (isActive: false) are left unchanged. Deleting a user in
 *   this app sets isActive to false, so those accounts are skipped too.
 *   Documents that also carry isDeleted, deleted, or deletedAt are skipped.
 *
 * Usage (from server/):
 *   node migrations/backfill_kpi_permissions_hod_admin.mjs --dry-run
 *   node migrations/backfill_kpi_permissions_hod_admin.mjs
 *
 * Database selection follows NODE_ENV:
 *   production -> PROD_MONGODB_URI
 *   server     -> SERVER_MONGODB_URI
 *   otherwise  -> DEV_MONGODB_URI
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import UserModel from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';

const isDryRun = process.argv.includes('--dry-run');

const getMongoUri = () => {
    if (process.env.NODE_ENV === 'production') return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === 'server') return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alvision';
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase().replace(/[^a-z]/g, '');

const isAdminRole = (role) => normalizeRole(role) === 'admin';

const isHodRole = (role) => {
    const normalized = normalizeRole(role);
    return normalized === 'hod' || normalized === 'headofdepartment';
};

const hasKpiModule = (modules) => {
    const list = Array.isArray(modules) ? modules : [];
    return list.some((m) => String(m).toLowerCase().trim() === 'kpi');
};

const normalizePerms = (perms) => {
    const list = Array.isArray(perms) ? perms : [];
    return [...new Set(
        list
            .map((p) => String(p).toLowerCase().trim())
            .filter((p) => p === 'assign' || p === 'view' || p === 'manage')
    )];
};

const samePerms = (a, b) => a.length === b.length && a.every((p, i) => p === b[i]);

const displayName = (user) => {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || user.username || String(user._id);
};

// Delete in this app deactivates the user (isActive: false). Also skip any
// document that was marked deleted with a separate flag.
const isInactiveOrDeleted = (user) => {
    if (user.isActive === false) return true;
    if (user.isDeleted === true || user.deleted === true) return true;
    if (user.deletedAt) return true;
    return false;
};

async function run() {
    const uri = getMongoUri();
    if (!uri) {
        console.error('No MongoDB URI found. Set DEV_MONGODB_URI, SERVER_MONGODB_URI, or PROD_MONGODB_URI.');
        process.exit(1);
    }

    console.log('=======================================================');
    console.log('Backfill KPI permissions: HOD = view, Admin = manage');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (no writes)' : 'LIVE'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('=======================================================');

    await mongoose.connect(uri);
    console.log('Connected.\n');

    try {
        const teams = await TeamModel.find({}, 'hodId name').lean();
        const hodIdSet = new Set(teams.map((t) => t.hodId?.toString()).filter(Boolean));

        const users = await UserModel.find(
            {},
            'username first_name last_name role isHod modules kpi_permissions isActive isDeleted deleted deletedAt'
        ).lean();

        const changes = [];
        const skippedInactive = [];

        for (const user of users) {
            const id = user._id.toString();
            const admin = isAdminRole(user.role);
            const hod = user.isHod === true || isHodRole(user.role) || hodIdSet.has(id);
            if (!admin && !hod) continue;

            const current = normalizePerms(user.kpi_permissions);
            const touchesKpi = hasKpiModule(user.modules) || current.length > 0;
            if (!touchesKpi) continue;

            const target = admin ? 'manage' : 'view';
            const reason = admin ? 'Admin' : 'HOD';
            const next = current.filter((p) => p !== 'assign');
            if (!next.includes(target)) next.push(target);

            if (samePerms(current, next)) continue;

            if (isInactiveOrDeleted(user)) {
                skippedInactive.push(user.username || displayName(user));
                continue;
            }

            changes.push({
                _id: user._id,
                username: user.username,
                name: displayName(user),
                role: user.role || '',
                reason,
                from: current,
                to: next,
            });
        }

        if (skippedInactive.length > 0) {
            console.log(`Skipped ${skippedInactive.length} inactive or deleted user(s): ${skippedInactive.join(', ')}`);
        }

        if (changes.length === 0) {
            console.log('No active users need an update. HODs already have view and admins already have manage, with no leftover assign.');
            return;
        }

        console.log(`${changes.length} user(s) will be updated:\n`);
        for (const change of changes) {
            console.log(
                `  ${change.reason.padEnd(5)} ${change.username || change.name}` +
                `  role=${change.role || '-'}  [${change.from.join(', ') || 'empty'}] -> [${change.to.join(', ')}]`
            );
        }

        if (isDryRun) {
            console.log('\nDry run only. Re-run without --dry-run to write these changes.');
            return;
        }

        const ops = changes.map((change) => ({
            updateOne: {
                filter: { _id: change._id },
                update: { $set: { kpi_permissions: change.to } },
            },
        }));

        const result = await UserModel.bulkWrite(ops);
        console.log(`\nUpdated ${result.modifiedCount} user(s).`);
    } finally {
        await mongoose.disconnect();
    }
}

run().catch(async (err) => {
    console.error('Migration failed:', err);
    try { await mongoose.disconnect(); } catch (_) { /* already closed */ }
    process.exit(1);
});
