import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Job from 'd:/eximdev/server/model/jobModel.mjs';

dotenv.config({ path: 'd:/eximdev/server/.env' });

async function checkJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const potentialJobs = await Job.find({
      mode: 'AIR',
      out_of_charge: { $nin: [null, ''] },
      'container_nos.delivery_date': { $nin: [null, ''] }
    }).lean();

    console.log(`Found ${potentialJobs.length} potential AIR jobs meeting criteria.`);
    
    potentialJobs.forEach(j => {
        const allDelivered = j.container_nos && j.container_nos.length > 0 && j.container_nos.every(c => c.delivery_date && c.delivery_date !== '');
        console.log(`Job: ${j.job_no}, Status: ${j.detailed_status}, All Delivered: ${allDelivered}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkJobs();
