import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './.env' });
import UserModel from '../model/userModel.mjs';

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash("admin123", salt);

        const updated = await UserModel.findOneAndUpdate(
            { username: "test_r" },
            { 
                $set: { 
                    password: hashedPassword,
                    role: "Admin",
                    isActive: true
                } 
            },
            { new: true }
        );

        if (updated) {
            console.log("SUCCESSFULLY UPDATED test_r USER:", updated.username, "ROLE:", updated.role);
        } else {
            console.log("USER test_r NOT FOUND");
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
