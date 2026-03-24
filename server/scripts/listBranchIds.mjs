import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://localhost:27017/eximNew";

async function check() {
    await mongoose.connect(MONGODB_URI);
    const branches = await mongoose.connection.db.collection('icds').find({}).toArray();
    console.log("Branches found:");
    branches.forEach(b => {
        console.log(`ID: ${b._id}, Name: ${b.branch_name}, Code: ${b.branch_code}`);
    });
    process.exit(0);
}

check();
