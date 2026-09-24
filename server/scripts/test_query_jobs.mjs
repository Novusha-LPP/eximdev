import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew');
const jobSchema = new mongoose.Schema({}, { strict: false });
const Job = mongoose.model('Job', jobSchema, 'jobs');

const query = {
  year: '26-27',
  status: { $in: ['Pending', 'pending', 'PENDING'] },
  detailed_status: { $in: ['Estimated Time of Arrival', 'estimated time of arrival', 'ESTIMATED TIME OF ARRIVAL'] }
};

// Find the 20 oldest by vessel_berthing string vs status_sort_date
const jobs = await Job.find(query)
  .select('job_no vessel_berthing status_sort_date custom_house importer be_no')
  .sort({ status_sort_date: 1 })
  .limit(20)
  .lean();

console.log('Top 20 by status_sort_date in local DB:', jobs.map(j => ({
  job_no: j.job_no,
  vessel_berthing: j.vessel_berthing,
  status_sort_date: j.status_sort_date,
  custom_house: j.custom_house,
  importer: j.importer
})));

await mongoose.disconnect();