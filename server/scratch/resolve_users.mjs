import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        const uri = process.env.MONGODB_URI || process.env.PROD_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI;
        await mongoose.connect(uri);
        
        const ids = ['6981c69dfd24d48e6c8597b0', '6672a2501aa931b68b091fe4'];
        const users = await User.find({ _id: { $in: ids } });
        
        console.log('\n--- Updated User Details ---');
        users.forEach(u => {
            console.log(`ID: ${u._id} | Name: ${u.first_name} ${u.last_name || ''} | Username: ${u.username}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
