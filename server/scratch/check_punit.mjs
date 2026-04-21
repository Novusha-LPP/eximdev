import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../SERVER/.env') });

import UserModel from '../SERVER/model/userModel.mjs';
import TeamModel from '../SERVER/model/teamModel.mjs';

async function checkUser(username) {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI_GANDHIDHAM || process.env.SERVER_MONGODB_URI_GANDHIDHAM);
        console.log('Connected to MongoDB');

        const user = await UserModel.findOne({ username }).select('_id username role first_name last_name');
        if (!user) {
            console.log(`User ${username} not found`);
            return;
        }

        console.log('User Details:', JSON.stringify(user, null, 2));

        const userTeamAsMember = await TeamModel.findOne({
            'members.userId': user._id,
            isActive: { $ne: false }
        });
        console.log('Team where user is Member:', userTeamAsMember ? `${userTeamAsMember.name} (HOD: ${userTeamAsMember.hodId})` : 'None');

        const userTeamAsHOD = await TeamModel.findOne({
            hodId: user._id,
            isActive: { $ne: false }
        });
        console.log('Team where user is HOD:', userTeamAsHOD ? userTeamAsHOD.name : 'None');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser('punit_pandey');
