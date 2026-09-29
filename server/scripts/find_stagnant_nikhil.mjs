import mongoose from 'mongoose';

async function run() {
  const client = await mongoose.connect('mongodb://localhost:27017');
  const adminDb = client.connection.db.admin();
  const dbs = await adminDb.listDatabases();

  for (const dbInfo of dbs.databases) {
    if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
    const testDb = client.connection.useDb(dbInfo.name);
    const collections = await testDb.db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    if (collNames.includes('crm_leads')) {
      const nikhil = await testDb.collection('crm_leads').find({
        $or: [
          { firstName: /Nikhil/i },
          { lastName: /Shah/i },
          { company: /Parmeswar/i },
          { company: /Parmeshwar/i },
          { firstName: /Vishal/i },
          { company: /Virgo/i }
        ]
      }).toArray();
      if (nikhil.length > 0) {
        console.log(`FOUND IN DB: ${dbInfo.name}`);
        nikhil.forEach(l => {
          console.log({
            _id: l._id,
            name: `${l.firstName} ${l.lastName}`,
            company: l.company,
            status: l.status,
            ownerId: l.ownerId,
            convertedTo: l.convertedTo
          });
        });
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
