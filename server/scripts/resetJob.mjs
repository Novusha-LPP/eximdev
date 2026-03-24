import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const client = new MongoClient(process.env.DEV_MONGODB_URI);
    await client.connect();
    const db = client.db('eximNew');

    const targetBranchId = new ObjectId('69abeeae0a6647027c4a09a8');
    const job22 = await db.collection('jobs').findOne({ branch_id: targetBranchId, year: '26-27', job_no: '00022' });

    if (job22) {
        console.log('Found job 22, updating to 15...');
        const newJobNumber = job22.job_number.replace('/00022/', '/00015/');
        await db.collection('jobs').updateOne(
            { _id: job22._id },
            { $set: { job_no: '00015', sequence_number: 15, job_number: newJobNumber } }
        );
        console.log('Updated to 15 successfully.');
    } else {
        console.log('Job 22 not found.');
    }

    await client.close();
}
run();
