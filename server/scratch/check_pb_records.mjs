import mongoose from 'mongoose';
import JobModel from '../model/jobModel.mjs';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.SERVER_MONGODB_URI);
    console.log("Connected");
    
    const sample = await JobModel.findOne({ "charges.purchase_book_no": { $exists: true, $ne: "" } }).lean();
    if (sample) {
        console.log("Found job with PB:", sample.job_no);
        console.log("Year field:", sample.year);
        console.log("Sample charge PB No:", sample.charges.find(c => c.purchase_book_no).purchase_book_no);
        console.log("Sample charge PB Approved At:", sample.charges.find(c => c.purchase_book_no).purchase_book_approved_at);
    } else {
        console.log("No jobs found with PB numbers in the entire DB!");
    }
    
    const count = await JobModel.countDocuments({ "charges.purchase_book_no": { $exists: true, $ne: "" } });
    console.log("Total jobs with PB numbers:", count);

    process.exit(0);
}

check();
