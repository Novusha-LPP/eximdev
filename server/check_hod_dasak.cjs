const mongoose = require('mongoose');

async function check() {
  try {
    await mongoose.connect('mongodb://exim:I9y5bcMUHkGHpgq2@ac-oqmvpdw-shard-00-00.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-01.xya3qh0.mongodb.net:27017,ac-oqmvpdw-shard-00-02.xya3qh0.mongodb.net:27017/exim?ssl=true&replicaSet=atlas-103rb8-shard-0&authSource=admin&retryWrites=true&w=majority');
    const db = mongoose.connection.db;

    const hod = await db.collection('users').findOne({ username: 'chirag_shah' });
    const emp = await db.collection('users').findOne({ username: 'dasak_shah' });

    if (!hod) { console.log('HOD chirag_shah not found'); process.exit(); }
    if (!emp) { console.log('Employee dasak_shah not found'); process.exit(); }

    console.log(`HOD: ${hod.first_name} ${hod.last_name} (${hod._id})`);
    console.log(`Emp: ${emp.first_name} ${emp.last_name} (${emp._id})`);

    // Find the team for the employee
    const team = await db.collection('teams').findOne({ 
        members: { $elemMatch: { userId: emp._id } } 
    });
    
    if (team) {
        console.log(`Team: ${team.name} (HOD ID: ${team.hod_id})`);
        if (team.hod_id.toString() === hod._id.toString()) {
            console.log('✅ chirag_shah IS the HOD for this team.');
        } else {
            console.log('❌ chirag_shah IS NOT the HOD for this team.');
            const actualHod = await db.collection('users').findOne({ _id: team.hod_id });
            console.log(`Actual HOD is: ${actualHod?.username || team.hod_id}`);
        }
    } else {
        console.log('❌ Employee is not in any team.');
    }

    // Find leave applications for dasak_shah
    const leaves = await db.collection('leaveapplications').find({ 
        employee_id: emp._id 
    }).sort({ createdAt: -1 }).toArray();

    console.log(`\nFound ${leaves.length} leave applications for dasak_shah:`);
    for (const l of leaves) {
        console.log(`- Date: ${l.from_date} to ${l.to_date}`);
        console.log(`  Status: ${l.status}`);
        console.log(`  HOD Review: ${l.hod_review_status} (Reviewed by: ${l.hod_reviewed_by || 'N/A'})`);
        console.log(`  Created At: ${l.createdAt}`);
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
