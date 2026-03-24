import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.DEV_MONGODB_URI);
    await client.connect();
    const db = client.db('eximNew');

    // Find specific branch ID user reported
    const targetBranchId = new ObjectId('69abeeae0a6647027c4a09a8');
    const branch = await db.collection('branches').findOne({ _id: targetBranchId });
    console.log('Target Branch:', branch);

    if (branch) {
        // Find jobs for this branch in 26-27 sorted by sequence number descending
        const jobs = await db.collection('jobs').find(
            { branch_id: targetBranchId, year: '26-27' },
            { projection: { job_no: 1, sequence_number: 1, job_number: 1 } }
        ).sort({ sequence_number: -1 }).limit(10).toArray();
        console.log('Top Jobs by Sequence:', jobs);

        // Find jobs by job_no string logic
        const allJobs = await db.collection('jobs').find(
            { branch_id: targetBranchId, year: '26-27' },
            { projection: { job_no: 1, sequence_number: 1 } }
        ).toArray();

        const jobNos = allJobs.map(j => {
            const parsed = parseInt(j.job_no, 10);
            return isNaN(parsed) ? -1 : parsed;
        }).sort((a, b) => b - a).slice(0, 10);
        console.log('Top parsed job_nos:', jobNos);
    }

    await client.close();
}
run();
