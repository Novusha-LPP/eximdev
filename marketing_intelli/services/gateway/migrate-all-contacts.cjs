const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/market_intelligence';
const EXIM_URI = process.env.EXIM_MONGO_URI || 'mongodb://localhost:27017/exim';
const EXPORT_URI = process.env.EXPORT_MONGO_URI || 'mongodb://localhost:27017/export';

async function migrate() {
  console.log('⚡ Connecting to MongoDB instances...');
  const mainConn = await mongoose.createConnection(MONGO_URI).asPromise();
  const eximConn = await mongoose.createConnection(EXIM_URI).asPromise();
  const exportConn = await mongoose.createConnection(EXPORT_URI).asPromise();

  const miCompaniesCol = mainConn.db.collection('mi_companies');
  const miContactsCol = mainConn.db.collection('mi_contacts');

  console.log(' Fetching contacts from exim database...');
  const eximContacts = await eximConn.db.collection('contacts').find({}).toArray();
  const eximAccounts = await eximConn.db.collection('accounts').find({}).toArray();
  const accountMap = new Map();
  eximAccounts.forEach(acc => {
    accountMap.set(acc._id.toString(), acc);
  });

  console.log(` Found ${eximContacts.length} contacts in exim database.`);

  let insertedCount = 0;

  for (const c of eximContacts) {
    const rawName = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    if (!rawName) continue;
    
    const acc = accountMap.get(c.accountId?.toString());
    const companyName = acc?.name?.trim();
    if (!companyName) continue;

    // Find or create company in mi_companies
    let company = await miCompaniesCol.findOne({ company_name: companyName });
    if (!company) {
      const insertDoc = {
        company_name: companyName,
        source_tags: ["exim_database"]
      };
      if (acc && acc.city) insertDoc.city = acc.city;
      if (acc && acc.gstin) insertDoc.gstin = acc.gstin;

      const newCompResult = await miCompaniesCol.insertOne(insertDoc);
      company = { _id: newCompResult.insertedId };
    }

    const phone = c.phone?.trim();
    const designation = c.title?.trim() || c.designation?.trim();

    const setFields = {
      full_name: rawName,
      company_id: company._id,
      updatedAt: new Date()
    };
    if (designation) setFields.current_designation = designation;
    if (phone) {
      setFields.mobile = phone;
      setFields.whatsapp_number = phone;
    }
    if (c.email) {
      setFields.email_work = c.email;
    }
    if (c.status) setFields.status = c.status;

    const setOnInsert = { createdAt: new Date() };
    if (designation) {
      setOnInsert.employment_history = [{ company_name: companyName, role: designation }];
    } else {
      setOnInsert.employment_history = [{ company_name: companyName }];
    }

    await miContactsCol.updateOne(
      { full_name: rawName, company_id: company._id },
      {
        $set: setFields,
        $setOnInsert: setOnInsert
      },
      { upsert: true }
    );
    insertedCount++;
  }

  console.log(` Migrated ${insertedCount} contacts from EXIM database into mi_contacts.`);

  // Migrate export database users with assigned companies
  const exportUsers = await exportConn.db.collection('users').find({}).toArray();
  console.log(` Processing ${exportUsers.length} users/contacts from EXPORT database...`);

  let exportCount = 0;
  for (const u of exportUsers) {
    if (!u.first_name) continue;
    const name = `${u.first_name} ${u.last_name || ''}`.trim();
    const compName = u.company?.trim();
    if (!compName) continue;
    
    let company = await miCompaniesCol.findOne({ company_name: compName });
    if (!company) {
      const res = await miCompaniesCol.insertOne({
        company_name: compName,
        source_tags: ["export_database"]
      });
      company = { _id: res.insertedId };
    }

    const designation = u.role;
    const setFields = {
      full_name: name,
      company_id: company._id,
      updatedAt: new Date()
    };
    if (designation) setFields.current_designation = designation;
    if (u.isActive !== undefined) setFields.status = u.isActive ? 'Active' : 'Inactive';
    if (u.email) setFields.email_work = u.email;
    if (u.phone) {
      setFields.mobile = u.phone;
      setFields.whatsapp_number = u.phone;
    }

    const setOnInsert = { createdAt: new Date() };
    if (designation) {
      setOnInsert.employment_history = [{ company_name: compName, role: designation }];
    } else {
      setOnInsert.employment_history = [{ company_name: compName }];
    }

    await miContactsCol.updateOne(
      { full_name: name, company_id: company._id },
      {
        $set: setFields,
        $setOnInsert: setOnInsert
      },
      { upsert: true }
    );
    exportCount++;
  }

  console.log(` Migrated ${exportCount} contacts/users from EXPORT database.`);

  const totalFinalContacts = await miContactsCol.countDocuments();
  const totalFinalCompanies = await miCompaniesCol.countDocuments();

  console.log(`\n🎉 Migration Summary:`);
  console.log(`  Total Companies in mi_companies: ${totalFinalCompanies}`);
  console.log(`  Total Contacts in mi_contacts: ${totalFinalContacts}`);

  await mainConn.close();
  await eximConn.close();
  await exportConn.close();
}

migrate().catch(console.error);
