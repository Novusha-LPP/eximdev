import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.PROD_MONGODB_URI;
await mongoose.connect(uri);

const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }), 'jobs');
const job = await Job.findOne({ 'charges.invoice_number': 'DLINV/26-27/0998' }).lean();

console.log('Job found:', job?.job_number);
if (job) {
  for (const c of job.charges) {
    if (c.invoice_number === 'DLINV/26-27/0998') {
      console.log('Charge:', JSON.stringify(c, null, 2));
    }
  }
}

await mongoose.disconnect();
