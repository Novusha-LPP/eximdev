import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function check() {
    try {
        console.log('Connecting to:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('Connected!');

        const results = {};

        const collections = await mongoose.connection.db.listCollections().toArray();
        results.collections = collections.map(c => c.name);

        const indexes = await mongoose.connection.db.collection('branches').indexes();
        results.indexes = indexes;

        const branches = await mongoose.connection.db.collection('branches').find().toArray();
        results.branchesCount = branches.length;
        results.sampleBranch = branches[0];

        fs.writeFileSync('check_results.json', JSON.stringify(results, null, 2));
        console.log('Results written to check_results.json');

        process.exit(0);
    } catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}

check();
