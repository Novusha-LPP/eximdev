import mongoose from 'mongoose';

async function run() {
  const client = await mongoose.connect('mongodb://localhost:27017');
  const adminDb = client.connection.db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('Databases:', dbs.databases.map(d => d.name));

  for (const dbInfo of dbs.databases) {
    if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
    const testDb = client.connection.useDb(dbInfo.name);
    const collections = await testDb.db.listCollections().toArray();
    const collNames = collections.map(c => c.name);
    if (collNames.includes('crm_leads') || collNames.includes('leads')) {
      const collName = collNames.includes('crm_leads') ? 'crm_leads' : 'leads';
      const count = await testDb.collection(collName).countDocuments();
      const nikhil = await testDb.collection(collName).find({
        $or: [{ firstName: /Nikhil/i }, { lastName: /Shah/i }, { company: /Parmeswar/i }, { name: /Nikhil/i }]
      }).toArray();
      console.log(`DB ${dbInfo.name}.${collName}: Total ${count}, Nikhil found: ${nikhil.length}`);
      if (nikhil.length > 0) {
        console.log('Nikhil record:', nikhil);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
