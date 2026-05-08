const mongoose = require('mongoose');

async function fix() {
  try {
    await mongoose.connect('mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority');
    const db = mongoose.connection.db;

    const hod = await db.collection('users').findOne({ username: 'chirag_shah' });
    if (!hod) { console.log('HOD chirag_shah not found'); process.exit(); }

    // Fix ACCOUNT team
    const result = await db.collection('teams').updateOne(
        { name: 'ACCOUNT' },
        { $set: { hod_id: hod._id } }
    );

    console.log(`Updated ACCOUNT team. Matches: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // Check if there are other teams with missing HOD
    const teams = await db.collection('teams').find({ 
        $or: [
            { hod_id: { $exists: false } },
            { hod_id: null }
        ]
    }).toArray();
    
    console.log('Other teams with missing HOD:', teams.map(t => t.name));

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
