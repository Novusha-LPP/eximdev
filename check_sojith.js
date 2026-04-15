const mongoose = require('mongoose');
const Team = require('./SERVER/model/teamModel.mjs').default; // Using .mjs with require might fail depending on node version, but let's try or use a different way if it fails.

async function checkTeam() {
    try {
        await mongoose.connect('mongodb://localhost:27017/exim');
        console.log('Connected to MongoDB');
        
        const teams = await Team.find({ 
            $or: [
                { hodUsername: 'sojith_mammuttil' },
                { name: /Export/i }
            ]
        });
        
        console.log('Teams found:', JSON.stringify(teams, null, 2));
        
        const users = await mongoose.connection.db.collection('users').find({ username: 'sojith_mammuttil' }).toArray();
        console.log('User found:', JSON.stringify(users, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkTeam();
