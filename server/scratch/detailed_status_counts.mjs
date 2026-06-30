import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import JobModel from '../model/jobModel.mjs';

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const counts = await JobModel.aggregate([
            {
                $match: {
                    status: { $regex: /^pending$/i },
                    branch_code: { $in: ["GIM", "COK"] },
                    year: "26-27"
                }
            },
            {
                $group: {
                    _id: "$detailed_status",
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log("Detailed status counts for GIM/COK in pending jobs (Year 26-27):");
        console.log(counts);

        // Also check regardless of year!
        const countsAllYears = await JobModel.aggregate([
            {
                $match: {
                    status: { $regex: /^pending$/i },
                    branch_code: { $in: ["GIM", "COK"] }
                }
            },
            {
                $group: {
                    _id: "$detailed_status",
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log("\nDetailed status counts for GIM/COK in pending jobs (All Years):");
        console.log(countsAllYears);

        // Check if there are jobs in general billing or purchase book?
        // Let's run a find on GIM/COK pending jobs to see what values they have for detailed_status
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
