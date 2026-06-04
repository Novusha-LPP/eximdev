import mongoose from 'mongoose';
import JobModel from '../model/jobModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
console.log("Connecting to MongoDB:", uri);

async function run() {
    try {
        await mongoose.connect(uri);
        console.log("Connected successfully!");

        const pipeline = [
            { $unwind: "$charges" },
            {
                $group: {
                    _id: null,
                    totalCharges: { $sum: 1 },
                    hasPB: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ["$charges.purchase_book_no", null] },
                                        { $ne: ["$charges.purchase_book_no", ""] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    hasPR: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ["$charges.payment_request_no", null] },
                                        { $ne: ["$charges.payment_request_no", ""] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    hasBoth: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ["$charges.purchase_book_no", null] },
                                        { $ne: ["$charges.purchase_book_no", ""] },
                                        { $gt: ["$charges.payment_request_no", null] },
                                        { $ne: ["$charges.payment_request_no", ""] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ];

        const stats = await JobModel.aggregate(pipeline);
        console.log("Charges statistics:", stats);

        // Fetch a few examples
        const examples = await JobModel.aggregate([
            { $unwind: "$charges" },
            {
                $project: {
                    job_number: 1,
                    chargeHead: "$charges.chargeHead",
                    purchase_book_no: "$charges.purchase_book_no",
                    payment_request_no: "$charges.payment_request_no"
                }
            },
            { $limit: 10 }
        ]);
        console.log("Example charges:", examples);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
