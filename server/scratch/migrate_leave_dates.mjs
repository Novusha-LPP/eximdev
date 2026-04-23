import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const TZ = 'Asia/Kolkata';
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true for safety

async function migrate() {
    try {
       // const uri = process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/exim";
       const uri = process.env.PROD_MONGODB_URI;
       console.log(`Connecting to ${uri}...`);
        await mongoose.connect(uri);
        console.log('Connected to DB');
        console.log(`Mode: ${DRY_RUN ? 'DRY RUN (No changes will be saved)' : 'LIVE (Changes will be saved)'}`);

        const LeaveApplication = mongoose.model('LeaveApplication', new mongoose.Schema({}, { strict: false }), 'leaveapplications');

        const applications = await LeaveApplication.find({}).lean();

        console.log(`Processing all ${applications.length} leave applications...`);

        let updatedCount = 0;

        for (const app of applications) {
            const originalFrom = moment(app.from_date);
            const originalTo = moment(app.to_date);
            const totalDays = Number(app.total_days || 0);

            if (totalDays <= 0) continue;

            // Target start: Start of the calendar day of from_date in IST
            const targetFrom = moment.tz(originalFrom, TZ).startOf('day');
            
            // Target end: End of the calendar day (From + totalDays - 1) in IST
            const targetTo = moment.tz(targetFrom, TZ).add(Math.ceil(totalDays) - 1, 'days').endOf('day');

            // Check if significant change is needed (ignoring small millisecond diffs)
            const needsUpdate = !originalFrom.isSame(targetFrom) || !originalTo.isSame(targetTo);

            if (needsUpdate) {
                console.log(`\nUpdating Leave ID: ${app._id}`);
                console.log(`  User: ${app.employeeName || app.employee_id}`);
                console.log(`  From: ${originalFrom.format('YYYY-MM-DD HH:mm:ss')} -> ${targetFrom.format('YYYY-MM-DD HH:mm:ss')} (IST)`);
                console.log(`  To:   ${originalTo.format('YYYY-MM-DD HH:mm:ss')}   -> ${targetTo.format('YYYY-MM-DD HH:mm:ss')} (IST)`);
                console.log(`  Days: ${totalDays}`);

                if (!DRY_RUN) {
                    await LeaveApplication.updateOne(
                        { _id: app._id },
                        { 
                            $set: { 
                                from_date: targetFrom.toDate(),
                                to_date: targetTo.toDate()
                            } 
                        }
                    );
                }
                updatedCount++;
            }
        }

        console.log(`\nMigration complete.`);
        console.log(`Total records matched for update: ${updatedCount}`);
        if (DRY_RUN && updatedCount > 0) {
            console.log(`\nSet DRY_RUN=false environment variable to apply these changes.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
