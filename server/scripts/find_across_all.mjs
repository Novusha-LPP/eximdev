import mongoose from 'mongoose';

async function run() {
  const client = await mongoose.connect('mongodb://localhost:27017');
  const dbs = [
    'eximdev', 'exim', 'eximNew', 'exim_db', 'eximclient', 'eximclientnew'
  ];

  for (const name of dbs) {
    const db = client.connection.useDb(name);
    const collections = (await db.db.listCollections().toArray()).map(c => c.name);
    for (const coll of ['crm_leads', 'leads', 'crm_opportunities', 'opportunities']) {
      if (collections.includes(coll)) {
        const found = await db.collection(coll).find({
          $or: [
            { firstName: /Nikhil/i },
            { company: /Parmeswar/i },
            { company: /Virgo/i },
            { company: /Gogeshwar/i }
          ]
        }).toArray();
        if (found.length > 0) {
          console.log(`=== DB: ${name}, Collection: ${coll}, Count: ${found.length} ===`);
          found.forEach(doc => {
            console.log({
              id: doc._id,
              name: doc.name || `${doc.firstName} ${doc.lastName}`,
              company: doc.company,
              status: doc.status,
              stage: doc.stage,
              ownerId: doc.ownerId,
              convertedTo: doc.convertedTo,
              createdAt: doc.createdAt
            });
          });
        }
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
