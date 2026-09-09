/**
 * CRM Seed Data Generator
 * Generates sample data for CRM Dashboard: Pipeline, Leads, Accounts, Contacts, Teams, Tasks
 *
 * Run:
 *   npm run seed:crm
 *
 * Outputs:
 *   - 35  CRM Leads
 *   - 25  CRM Accounts
 *   - 50  CRM Contacts
 *   - 8   Sales Teams
 *   - 40  Opportunities (Pipeline)
 *   - 30  CRM Tasks
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Account from '../model/crm/Account.mjs';
import Contact from '../model/crm/Contact.mjs';
import Lead from '../model/crm/Lead.mjs';
import Opportunity from '../model/crm/Opportunity.mjs';
import Organization from '../model/crm/Organization.mjs';
import SalesTeam from '../model/crm/SalesTeam.mjs';
import Task from '../model/crm/Task.mjs';
import User from '../model/userModel.mjs';

const LEADS_COUNT = 35;
const ACCOUNTS_COUNT = 25;
const CONTACTS_COUNT = 50;
const TEAMS_COUNT = 8;
const OPPORTUNITIES_COUNT = 40;
const TASKS_COUNT = 30;

const SERVICES = ['custom clearance', 'freight forwarding', 'dgft', 'e-lock', 'client', 'transportation', 'paramount', 'rabs', 'auto rack'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified'];
const OPPORTUNITY_STAGES = ['lead', 'qualified', 'opportunity', 'proposal', 'negotiation', 'won', 'lost'];
const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'];
const TASK_TYPES = ['call', 'email', 'meeting', 'research', 'other'];
const SOURCES = ['web', 'referral', 'email', 'social', 'event'];
const GRADES = ['A', 'B', 'C', 'D'];
const COMPANY_SUFFIXES = ['Exim Pvt Ltd', 'International Trade Co', 'Freight Solutions', 'Cargo Movers', 'Global Exports', 'Shipping Lines Inc', 'Logistics Hub', 'SeaAir Cargo', 'TradeConnect', 'ExportPro'];
const FIRST_NAMES = ['Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Neha', 'Suresh', 'Anjali', 'Rahul', 'Kavita', 'Deepak', 'Meera', 'Arun', 'Pooja', 'Sanjay', 'Ritu', 'Manoj', 'Shalini', 'Kiran', 'Divya'];
const LAST_NAMES = ['Sharma', 'Patel', 'Gupta', 'Kumar', 'Singh', 'Joshi', 'Agarwal', 'Verma', 'Reddy', 'Iyer', 'Nair', 'Malhotra', 'Chauhan', 'Mehta', 'Bhatia'];
const TERRITORIES = ['North India', 'South India', 'West India', 'East India', 'Central India', 'Mumbai-Delhi Corridor', 'Coastal Belt', 'Inland Belt'];
const INDUSTRIES = ['Manufacturing', 'Textiles', 'Agriculture', 'Engineering', 'Pharmaceuticals', 'Auto Components', 'Electronics', 'Handicrafts', 'IT Services', 'Chemicals'];
const TITLE_ROLES = ['Purchase Manager', 'Export Manager', 'Logistics Head', 'Procurement Officer', 'CEO', 'General Manager', 'Operations Head', 'Supply Chain Manager', 'Freight Manager', 'Trade Compliance Officer'];
const TEAM_NAMES = ['North Zone Team', 'South Zone Team', 'West Coast Team', 'East Coast Team', 'Auto Rack Specialists', 'Freight Forwarding Squad', 'Customs Clearance Team', 'DGFT Compliance Team'];
const TASK_TITLE_OPTIONS = [
  'Follow up on proposal',
  'Schedule client meeting',
  'Send quotation',
  'Prepare contract',
  'Customer call',
  'Document verification',
  'Update CRM records',
  'Send email to prospect',
  'Review deal terms',
  'Coordinate with logistics team',
  'Check shipment status',
  'Prepare invoice',
  'Follow up on payment',
  'Renegotiate terms'
];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (daysBack, daysForward) => {
  const now = new Date('2026-06-10T13:42:55+05:30');
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (future.getTime() - past.getTime()));
};
const uniqueCrates = () => {
  const crateTypes = ['20ft', '40ft', '40ft HC', '45ft', 'Open Top', 'Flat Rack', 'Reefer'];
  const selected = new Set();
  while (selected.size < randomInt(1, 2)) selected.add(randomItem(crateTypes));
  return Array.from(selected);
};

const connectDB = async () => {
  const uri = process.env.DEV_MONGODB_URI || process.env.SERVER_MONGODB_URI || process.env.PROD_MONGODB_URI;
  console.log('DB URI:', uri);
  if (!uri) {
    console.error('No MongoDB URI found in environment variables');
    console.error('Tried: DEV_MONGODB_URI, SERVER_MONGODB_URI, PROD_MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log('✅ Connected to MongoDB');
};

const getOrCreateOrganization = async () => {
  let org = await Organization.findOne();
  if (!org) {
    org = await Organization.create({
      name: 'AlVision Exim',
      slug: 'alvision-exim',
      plan: 'pro',
      settings: { pipelineConfig: {}, currency: 'INR', timezone: 'Asia/Kolkata' }
    });
    console.log('🏢 Created default organization');
  }
  return org;
};

const getUsers = async (orgId) => {
  return await User.find().sort({ _id: 1 }).limit(40).lean();
};

const seedSalesTeams = async (users) => {
  await SalesTeam.deleteMany({});
  const teams = [];
  const managers = users.filter(u => u.crmRole === 'Manager' || u.crmRole === 'Admin');
  const fallbackManager = users[0];
  const allMemberIds = users.map((u) => u._id);
  for (let i = 0; i < TEAMS_COUNT; i++) {
    const chunkSize = Math.max(1, Math.floor(allMemberIds.length / TEAMS_COUNT));
    const teamMembers = allMemberIds.slice(i * chunkSize, i * chunkSize + chunkSize);
    teams.push({
      name: TEAM_NAMES[i],
      description: `${TEAM_NAMES[i]} for managing accounts and opportunities across regions`,
      managerId: managers[i % managers.length] || fallbackManager._id,
      memberIds: teamMembers,
      type: randomItem(['regional', 'product', 'industry']),
      quotas: {
        monthlyRevenue: randomInt(500000, 5000000),
        quarterlyRevenue: randomInt(1500000, 15000000),
        annualRevenue: randomInt(5000000, 50000000),
        dealCount: randomInt(5, 50)
      },
      performance: {
        currentRevenue: randomInt(100000, 3000000),
        currentDeals: randomInt(1, 20),
        winRate: randomInt(20, 80),
        avgDealSize: randomInt(50000, 500000),
        salesCycleLength: randomInt(15, 90)
      },
      isActive: true
    });
  }
  const result = await SalesTeam.insertMany(teams);
  console.log(`✅ Seeded ${result.length} sales teams`);
  return result;
};

const seedLeads = async (ownerIds) => {
  await Lead.deleteMany({});
  const leads = [];
  for (let i = 0; i < LEADS_COUNT; i++) {
    const ownerId = ownerIds[i % ownerIds.length];
    const companyName = `${randomItem(FIRST_NAMES)} ${randomItem(COMPANY_SUFFIXES)}`;
    leads.push({
      ownerId,
      company: companyName,
      firstName: randomItem(FIRST_NAMES),
      lastName: randomItem(LAST_NAMES),
      email: `contact${i}@${companyName.toLowerCase().replaceAll(' ', '').slice(0, 8)}.com`,
      phone: `+91-${randomInt(7000000000, 9999999999)}`,
      status: randomItem(LEAD_STATUSES),
      interestedServices: Array.from({ length: randomInt(1, 3) }, () => randomItem(SERVICES)).filter((v, idx, arr) => arr.indexOf(v) === idx),
      source: randomItem(SOURCES),
      score: randomInt(10, 100),
      grade: randomItem(GRADES),
      crateSize: randomItem(uniqueCrates()),
      period: '2026-05',
      convertedAt: undefined,
      createdAt: randomDate(150, 0),
      updatedAt: randomDate(30, 0)
    });
  }
  const result = await Lead.insertMany(leads);
  console.log(`✅ Seeded ${result.length} leads`);
  return result;
};

const seedAccounts = async (ownerIds) => {
  await Account.deleteMany({});
  const accounts = [];
  const usedNames = new Set();
  for (let i = 0; i < ACCOUNTS_COUNT; i++) {
    const ownerId = ownerIds[i % ownerIds.length];
    let name = `${randomItem(FIRST_NAMES)} ${randomItem(COMPANY_SUFFIXES)}`;
    let attempts = 0;
    while (usedNames.has(name) && attempts < 20) {
      name = `${randomItem(FIRST_NAMES)} ${randomItem(COMPANY_SUFFIXES)}`;
      attempts++;
    }
    usedNames.add(name);
    accounts.push({
      ownerId,
      name,
      industry: randomItem(INDUSTRIES),
      size: randomItem(['startup', 'small', 'medium', 'large', '1-10', '11-50', '51-200', '200+']),
      website: `https://www.${randomItem(['globexim', 'tradeconnect', 'cargomax', 'sealink', 'freightpro', 'exporthub'])}.com`,
      annualRevenue: randomInt(500000, 50000000),
      healthScore: randomInt(30, 95),
      address: `${randomInt(1, 999)}, ${randomItem(['MG Road', 'Industrial Area', 'Export Plaza', 'Trade Zone', 'Commercial Complex'])}, ${randomItem(['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Ahmedabad', 'Pune', 'Hyderabad'])}`,
      period: '2026-05',
      createdAt: randomDate(180, 0),
      updatedAt: randomDate(30, 0)
    });
  }
  const result = await Account.insertMany(accounts);
  console.log(`✅ Seeded ${result.length} accounts`);
  return result;
};

const seedContacts = async (users, accounts) => {
  await Contact.deleteMany({});
  const contacts = [];
  for (let i = 0; i < CONTACTS_COUNT; i++) {
    const account = accounts[i % accounts.length];
    const owner = users[i % users.length];
    contacts.push({
      accountId: account._id,
      ownerId: owner._id,
      firstName: randomItem(FIRST_NAMES),
      lastName: randomItem(LAST_NAMES),
      email: `person${i}@${account.name.toLowerCase().replaceAll(' ', '').slice(0, 8)}.com`,
      phone: `+91-${randomInt(7000000000, 9999999999)}`,
      title: randomItem(TITLE_ROLES),
      isPrimary: Math.random() > 0.7,
      tags: ['decision-maker', 'influencer'].slice(0, randomInt(1, 2)),
      period: '2026-05',
      convertedFromLead: undefined,
      createdAt: randomDate(120, 0),
      updatedAt: randomDate(20, 0)
    });
  }
  const result = await Contact.insertMany(contacts);
  console.log(`✅ Seeded ${result.length} contacts`);
  return result;
};

const seedOpportunities = async (users, accounts, contacts, leads) => {
  await Opportunity.deleteMany({});

  const opportunityNames = [
    'Bulk Shipment',
    'Contract Renewal',
    'New Business',
    'Expansion Deal',
    'Annual Agreement',
    'Spot Deal',
    'Long-term Partnership'
  ];

  const opportunities = [];
  const stageCounts = {};
  const stageValues = {
    lead: 0,
    qualified: 0,
    opportunity: 0,
    proposal: 0,
    negotiation: 0,
    won: 0,
    lost: 0
  };

  for (let i = 0; i < OPPORTUNITIES_COUNT; i++) {
    const account = accounts[i % accounts.length];
    const stage = OPPORTUNITY_STAGES[i % OPPORTUNITY_STAGES.length];
    const probability = stage === 'won' ? 100 : stage === 'lost' ? 0 : randomInt(10, 90);
    const value = randomInt(100000, 5000000);
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    stageValues[stage] += value;

    opportunities.push({
      accountId: account._id,
      primaryContactId: contacts[i % contacts.length]._id,
      ownerId: users[i % users.length]._id,
      name: `${account.name} - ${opportunityNames[i % opportunityNames.length]}`,
      value,
      stage,
      forecastCategory: randomItem(['pipeline', 'best_case', 'commit', 'closed']),
      services: [SERVICES[i % SERVICES.length]],
      expectedCloseDate: randomDate(15, 60),
      probability,
      crateSize: randomItem(uniqueCrates()),
      period: '2026-05',
      closeReason: stage === 'lost' ? randomItem(['Price Lost', 'Product Lost', 'No Reply / No Response']) : undefined,
      closeNotes: stage === 'lost' ? 'Customer chose another provider' : undefined,
      stageHistory: [
        { stage: 'lead', enteredAt: randomDate(150, 90), exitedAt: randomDate(90, 60) },
        { stage: 'qualified', enteredAt: randomDate(90, 60), exitedAt: randomDate(60, 30) },
        { stage, enteredAt: randomDate(30, 0), exitedAt: undefined }
      ],
      remarks: [],
      convertedFromLead: undefined,
      createdAt: randomDate(150, 0),
      updatedAt: randomDate(10, 0)
    });
  }
  const result = await Opportunity.insertMany(opportunities);
  console.log(`✅ Seeded ${result.length} opportunities`);
  console.log(`   Stage breakdown: ${JSON.stringify(stageCounts)}`);
  console.log(`   Total pipeline value: ₹${(Object.values(stageValues).reduce((a, b) => a + b, 0) / 100000).toFixed(1)}L`);
  return result;
};

const seedTasks = async (users, accounts, opportunities) => {
  await Task.deleteMany({});
  const tasks = [];
  for (let i = 0; i < TASKS_COUNT; i++) {
    const assignedTo = users[i % users.length];
    const relatedRecord = i < TASKS_COUNT / 2 ? accounts[i % accounts.length] : opportunities[i % opportunities.length];
    const relatedModel = i < TASKS_COUNT / 2 ? 'Account' : 'Opportunity';
    tasks.push({
      assignedTo: assignedTo._id,
      createdBy: assignedTo._id,
      title: `${TASK_TITLE_OPTIONS[i % TASK_TITLE_OPTIONS.length]} - ${relatedRecord.name || 'General'}`,
      description: 'CRM seed task',
      type: randomItem(TASK_TYPES),
      relatedTo: { name: relatedRecord.name || 'General', model: relatedModel, id: relatedRecord._id },
      dueDate: randomDate(2, 20),
      status: randomItem(TASK_STATUSES),
      priority: randomItem(['low', 'medium', 'high', 'urgent']),
      reminder: randomDate(0, 5),
      createdAt: randomDate(30, 0),
      updatedAt: randomDate(5, 0)
    });
  }
  const result = await Task.insertMany(tasks);
  console.log(`✅ Seeded ${result.length} tasks`);
  return result;
};

const seedAll = async () => {
  console.log('🚀 Starting CRM Data Seeding...\n');
  await connectDB();

  const org = await getOrCreateOrganization();
  console.log(`🏢 Tenant: ${org.name} (${org._id})\n`);

  const users = await getUsers(org._id);
  if (users.length === 0) {
    throw new Error('No users found. Please create users before seeding CRM data.');
  }
  console.log(`👥 Found ${users.length} users\n`);

  const ownerIds = users.map((u) => u._id);
  const teams = await seedSalesTeams(users);
  const leads = await seedLeads(ownerIds);
  const accounts = await seedAccounts(ownerIds);
  const contacts = await seedContacts(users, accounts);
  const opportunities = await seedOpportunities(users, accounts, contacts, leads);
  const tasks = await seedTasks(users, accounts, opportunities);

  console.log('\n✨ CRM Data Seeding Complete!');
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Leads: ${leads.length}`);
  console.log(`   Accounts: ${accounts.length}`);
  console.log(`   Contacts: ${contacts.length}`);
  console.log(`   Opportunities: ${opportunities.length}`);
  console.log(`   Tasks: ${tasks.length}`);

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
  process.exit(0);
};

seedAll().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
