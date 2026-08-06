// ─── Schema Inspector for eximNew & export ──────────────────────
import mongoose from 'mongoose';

async function inspect() {
  const eximConn = await mongoose.createConnection('mongodb://localhost:27017/eximNew').asPromise();
  const exportConn = await mongoose.createConnection('mongodb://localhost:27017/export').asPromise();

  console.log('--- eximNew Sample Company ---');
  const eximCompany = await eximConn.db!.collection('companies').findOne({});
  console.log(JSON.stringify(eximCompany, null, 2));

  console.log('--- eximNew Sample Customer ---');
  const eximCustomer = await eximConn.db!.collection('customers').findOne({});
  console.log(JSON.stringify(eximCustomer, null, 2));

  console.log('--- eximNew Sample Lead ---');
  const eximLead = await eximConn.db!.collection('leads').findOne({});
  console.log(JSON.stringify(eximLead, null, 2));

  console.log('--- export Sample Document ---');
  const exportColNames = await exportConn.db!.listCollections().toArray();
  console.log('Export collections:', exportColNames.map(c => c.name));

  await eximConn.close();
  await exportConn.close();
}

inspect().catch(console.error);
