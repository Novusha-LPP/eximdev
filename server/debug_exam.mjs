import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import JobModel from './model/jobModel.mjs';

await mongoose.connect(process.env.MONGODB_URI);

const examTrue = await JobModel.countDocuments({
    status: { $regex: /^Pending$/i },
    examinationPlanning: true
});

const examTrueNoDate = await JobModel.countDocuments({
    status: { $regex: /^Pending$/i },
    examinationPlanning: true,
    $or: [
        { examination_planning_date: { $exists: false } },
        { examination_planning_date: "" },
        { examination_planning_date: null }
    ]
});

const examTrueStr = await JobModel.countDocuments({
    status: { $regex: /^Pending$/i },
    examinationPlanning: "true"
});

const allPending = await JobModel.countDocuments({
    status: { $regex: /^Pending$/i },
    be_no: { $exists: true, $ne: "" }
});

// Check sample job for the field
const sample = await JobModel.findOne({
    status: { $regex: /^Pending$/i },
    examinationPlanning: { $exists: true }
}).select('job_no examinationPlanning examination_planning_date status').lean();

console.log('examinationPlanning=true (bool):', examTrue);
console.log('examinationPlanning="true" (string):', examTrueStr);
console.log('examTrue + no date:', examTrueNoDate);
console.log('all pending with be_no:', allPending);
console.log('sample job:', JSON.stringify(sample, null, 2));

process.exit(0);
