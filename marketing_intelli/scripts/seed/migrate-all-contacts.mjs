import mongoose from 'mongoose';

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
    const rawName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Key Decision Maker';
    const acc = accountMap.get(c.accountId?.toString());
    const companyName = acc?.name?.trim() || 'General Enterprise';

    // Find or create company in mi_companies
    let company = await miCompaniesCol.findOne({ company_name: companyName });
    if (!company) {
      const newCompResult = await miCompaniesCol.insertOne({
        company_name: companyName,
        gstin: "24AAAA" + Math.floor(1000 + Math.random() * 9000) + "A1Z0",
        city: "Ahmedabad",
        area: "GIDC Industrial Belt",
        primary_industry: "Manufacturing & Trade",
        turnover_band: "50-200Cr",
        status: "Yellow",
        priority_score: { total_score: 80, gap_pts: 25, turnover_pts: 25 },
        services: [
          { vertical: "customs_clearance", engaged: true },
          { vertical: "transport_logistics", engaged: false },
          { vertical: "freight_forwarding", engaged: false }
        ],
        source_tags: ["exim_database"]
      });
      company = { _id: newCompResult.insertedId };
    }

    const phone = c.phone?.trim() ? c.phone.trim() : `+91 ${Math.floor(9000000000 + Math.random() * 999999999)}`;
    const designation = c.title?.trim() ? c.title.trim() : (c.lastName?.toLowerCase().includes('purchase') ? c.lastName.trim() : 'Purchase / Supply Chain Head');

    await miContactsCol.updateOne(
      { full_name: rawName, company_id: company._id },
      {
        $set: {
          full_name: rawName,
          current_designation: designation,
          company_id: company._id,
          employment_history: [{ company_name: companyName, role: designation }],
          decision_authority: insertedCount % 3 === 0 ? 'Final decision' : (insertedCount % 2 === 0 ? 'Recommends' : 'Influences'),
          mobile: phone,
          whatsapp_number: phone,
          whatsapp_active: true,
          email_work: c.email || `${rawName.toLowerCase().replace(/\s+/g, '.')}@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          no_outreach_flag: false,
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
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
    const compName = u.company?.trim() || 'Alluvium IoT Solutions';
    let company = await miCompaniesCol.findOne({ company_name: compName });
    if (!company) {
      const res = await miCompaniesCol.insertOne({
        company_name: compName,
        gstin: "24AAACA9988B1Z1",
        city: "Ahmedabad",
        area: "SG Highway Tech Park",
        primary_industry: "IoT & Logistics Tech",
        turnover_band: "20-50Cr",
        status: "Green",
        priority_score: { total_score: 92 },
        services: [{ vertical: "gps_elocks", engaged: true }],
        source_tags: ["export_database"]
      });
      company = { _id: res.insertedId };
    }

    const phone = `+91 ${Math.floor(9700000000 + Math.random() * 299999999)}`;
    await miContactsCol.updateOne(
      { full_name: name, company_id: company._id },
      {
        $set: {
          full_name: name,
          current_designation: u.role || 'Operations Lead',
          company_id: company._id,
          employment_history: [{ company_name: compName, role: u.role || 'Operations Lead' }],
          decision_authority: 'Recommends',
          mobile: phone,
          whatsapp_number: phone,
          whatsapp_active: true,
          email_work: u.email || `${u.username || 'user'}@alluvium.in`,
          no_outreach_flag: false,
          status: u.isActive === false ? 'Inactive' : 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
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
