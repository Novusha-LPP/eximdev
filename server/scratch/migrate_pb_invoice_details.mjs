import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI;

const jobSchema = new mongoose.Schema({
    awb_bl_no: String,
    awb_bl_date: String,
}, { strict: false });

const Job = mongoose.model('job', jobSchema);

const purchaseBookEntrySchema = new mongoose.Schema({
    entryNo: { type: String, required: true },
    supplierInvNo: { type: String },
    supplierInvDate: { type: String },
    jobRef: { type: String },
    jobNo: { type: String },
}, { strict: false });

const PurchaseBookEntry = mongoose.model('purchaseBookEntry', purchaseBookEntrySchema);

function formatToISO(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr; // Already ISO
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // DD/MM/YYYY to YYYY-MM-DD
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return dateStr;
}

async function migrate() {
    if (!MONGODB_URI) {
        console.error("MONGODB_URI is not defined in .env");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        // Find entries where supplierInvNo OR supplierInvDate is missing
        const entries = await PurchaseBookEntry.find({
            $or: [
                { supplierInvNo: { $in: ["", null, undefined] } },
                { supplierInvDate: { $in: ["", null, undefined] } }
            ]
        }).lean();

        console.log(`Found ${entries.length} entries to check.`);

        let updatedCount = 0;
        for (const entry of entries) {
            let job = null;
            if (entry.jobRef) {
                job = await Job.findById(entry.jobRef).lean();
            } else if (entry.jobNo) {
                job = await Job.findOne({ job_number: entry.jobNo }).lean();
            }

            if (job) {
                const updates = {};
                if (!entry.supplierInvNo || entry.supplierInvNo.trim() === '') {
                    updates.supplierInvNo = job.awb_bl_no || '';
                }
                if (!entry.supplierInvDate || entry.supplierInvDate.trim() === '') {
                    updates.supplierInvDate = formatToISO(job.awb_bl_date || '');
                }

                if (Object.keys(updates).length > 0) {
                    await PurchaseBookEntry.updateOne({ _id: entry._id }, { $set: updates });
                    updatedCount++;
                    console.log(`Updated Entry ${entry.entryNo} for Job ${entry.jobNo || job.job_number}`);
                }
            }
        }

        console.log(`Migration completed. Updated ${updatedCount} entries.`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
