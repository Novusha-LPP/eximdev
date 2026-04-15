import mongoose from 'mongoose';
import Team from './model/teamModel.mjs';

async function checkTeam() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        console.log('Connected to MongoDB');
        
        const username = 'sojith_mammuttil';
        
        // Find user first to get their ID
        const user = await mongoose.connection.db.collection('users').findOne({ username: username });
        if (!user) {
            console.log('User not found:', username);
        } else {
            console.log('User found:', {
                _id: user._id,
                username: user.username,
                role: user.role
            });

            const teams = await Team.find({ 
                $or: [
                    { hodId: user._id },
                    { hodUsername: username },
                    { name: /Export/i }
                ],
                isActive: { $ne: false }
            });
            
            console.log('Teams found:', JSON.stringify(teams, null, 2));
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkTeam();
