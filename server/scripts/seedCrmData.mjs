import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import Organization from '../model/crm/Organization.mjs';
import Account from '../model/crm/Account.mjs';
import Contact from '../model/crm/Contact.mjs';
import Lead from '../model/crm/Lead.mjs';
import Opportunity from '../model/crm/Opportunity.mjs';
import Quote from '../model/crm/Quote.mjs';
import Activity from '../model/crm/Activity.mjs';
import Task from '../model/crm/Task.mjs';
import User from '../model/userModel.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.DEV_MONGODB_URI;

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // 1. Get or Create Organization
    let org = await Organization.findOne({ name: 'Alvision Global' });
    if (!org) {
      org = await Organization.create({
        name: 'Alvision Global',
        slug: 'alvision-global',
        plan: 'pro',
        settings: {
          currency: 'INR',
          timezone: 'Asia/Kolkata'
        }
      });
      console.log('Created Organization: Alvision Global');
    }

    // 2. Get a User to be the owner
    const user = await User.findOne({ username: 'krishna' }) || await User.findOne({});
    if (!user) {
      console.error('No users found in database. Please create a user first.');
      process.exit(1);
    }
    const userId = user._id;
    const tenantId = org._id;

    console.log(`Using User: ${user.username} (${userId}) for seeding.`);

    const timestamp = Date.now().toString().slice(-4);

    // 3. Create Accounts
    const accountsData = [
      {
        tenantId,
        ownerId: userId,
        name: `Global Logistics Solutions ${timestamp}`,
        industry: 'Logistics',
        size: 'large',
        website: 'https://globallogistics.example.com',
        annualRevenue: 50000000,
        address: '123 Logistics Way, Mumbai, Maharashtra'
      },
      {
        tenantId,
        ownerId: userId,
        name: `TechNova Systems ${timestamp}`,
        industry: 'Technology',
        size: 'medium',
        website: 'https://technova.example.com',
        annualRevenue: 12000000,
        address: '45 IT Park, Bangalore, Karnataka'
      },
      {
        tenantId,
        ownerId: userId,
        name: `Sunrise Exports ${timestamp}`,
        industry: 'Manufacturing',
        size: 'small',
        website: 'https://sunriseexports.example.com',
        annualRevenue: 5000000,
        address: 'Plot 12, Industrial Area, Ahmedabad, Gujarat'
      }
    ];

    const accounts = await Account.insertMany(accountsData);
    console.log(`Created ${accounts.length} Accounts.`);

    // 4. Create Contacts
    const contactsData = [
      {
        tenantId,
        accountId: accounts[0]._id,
        ownerId: userId,
        firstName: 'Rajesh',
        lastName: `Kumar ${timestamp}`,
        email: `rajesh.${timestamp}@globallogistics.example.com`,
        phone: '+91 9876543210',
        title: 'Operations Manager',
        isPrimary: true
      },
      {
        tenantId,
        accountId: accounts[1]._id,
        ownerId: userId,
        firstName: 'Anjali',
        lastName: `Sharma ${timestamp}`,
        email: `anjali.${timestamp}@technova.example.com`,
        phone: '+91 8765432109',
        title: 'CTO',
        isPrimary: true
      },
      {
        tenantId,
        accountId: accounts[2]._id,
        ownerId: userId,
        firstName: 'Amit',
        lastName: `Patel ${timestamp}`,
        email: `amit.${timestamp}@sunriseexports.example.com`,
        phone: '+91 7654321098',
        title: 'Proprietor',
        isPrimary: true
      }
    ];

    const contacts = await Contact.insertMany(contactsData);
    console.log(`Created ${contacts.length} Contacts.`);

    // 5. Create Leads
    const leadsData = [
      {
        tenantId,
        ownerId: userId,
        company: `Rapid Freight ${timestamp}`,
        firstName: 'Suresh',
        lastName: 'Iyer',
        email: `suresh.${timestamp}@rapidfreight.example.com`,
        phone: '+91 9998887776',
        status: 'new',
        interestedServices: ['custom clearance', 'freight forwarding'],
        source: 'web',
        score: 45
      },
      {
        tenantId,
        ownerId: userId,
        company: `Oceanic Carriers ${timestamp}`,
        firstName: 'Vikram',
        lastName: 'Singh',
        email: `vikram.${timestamp}@oceanic.example.com`,
        phone: '+91 8887776665',
        status: 'contacted',
        interestedServices: ['transportation'],
        source: 'referral',
        score: 65
      }
    ];

    const leads = await Lead.insertMany(leadsData);
    console.log(`Created ${leads.length} Leads.`);

    // 6. Create Converted Lead
    const convertedLead = await Lead.create({
      tenantId,
      ownerId: userId,
      company: `Express Cargo Inc ${timestamp}`,
      firstName: 'Neha',
      lastName: 'Gupta',
      email: `neha.${timestamp}@expresscargo.example.com`,
      phone: '+91 7776665554',
      status: 'converted',
      interestedServices: ['dgft', 'e-lock'],
      source: 'email',
      score: 90,
      convertedAt: new Date()
    });

    const expressAccount = await Account.create({
      tenantId,
      ownerId: userId,
      name: `Express Cargo Inc ${timestamp}`,
      industry: 'Logistics',
      size: 'medium',
      address: '77 Cargo Terminal, Delhi'
    });

    const expressContact = await Contact.create({
      tenantId,
      accountId: expressAccount._id,
      ownerId: userId,
      firstName: 'Neha',
      lastName: 'Gupta',
      email: `neha.${timestamp}@expresscargo.example.com`,
      phone: '+91 7776665554',
      title: 'Logistics Head',
      isPrimary: true,
      convertedFromLead: convertedLead._id
    });

    convertedLead.convertedTo = {
      accountId: expressAccount._id,
      contactId: expressContact._id
    };
    await convertedLead.save();
    console.log('Created 1 Converted Lead and associated Account/Contact.');

    // 7. Create Opportunities
    const opportunitiesData = [
      {
        tenantId,
        accountId: accounts[0]._id,
        primaryContactId: contacts[0]._id,
        ownerId: userId,
        name: `Freight Management - ${timestamp}`,
        value: 2500000,
        stage: 'proposal',
        forecastCategory: 'best_case',
        services: ['freight forwarding', 'transportation'],
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        probability: 60
      },
      {
        tenantId,
        accountId: accounts[1]._id,
        primaryContactId: contacts[1]._id,
        ownerId: userId,
        name: `Custom Clearance - ${timestamp}`,
        value: 500000,
        stage: 'won',
        forecastCategory: 'closed',
        services: ['custom clearance', 'dgft'],
        expectedCloseDate: new Date(),
        probability: 100
      }
    ];

    const opportunities = await Opportunity.insertMany(opportunitiesData);
    console.log(`Created ${opportunities.length} Opportunities.`);

    // 8. Create Quotes
    const quote = await Quote.create({
      tenantId,
      quoteNumber: `QT-${new Date().getFullYear()}-${timestamp}`,
      opportunityId: opportunities[0]._id,
      accountId: accounts[0]._id,
      contactId: contacts[0]._id,
      createdById: userId,
      title: 'Freight Services Proposal',
      lineItems: [
        { productName: 'Sea Freight', quantity: 10, unitPrice: 50000, lineTotal: 500000 },
        { productName: 'Custom Clearance', quantity: 1, unitPrice: 25000, lineTotal: 25000 }
      ],
      subtotal: 525000,
      total: 525000,
      currency: 'INR',
      terms: {
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      },
      status: 'sent'
    });
    console.log(`Created Quote: ${quote.quoteNumber}`);

    // 9. Create Activities & Tasks
    await Activity.create({
      tenantId,
      userId: userId,
      type: 'call',
      subject: 'Initial discovery call',
      description: 'Discussed their current freight challenges.',
      relatedTo: { model: 'Opportunity', id: opportunities[0]._id },
      status: 'completed'
    });

    await Task.create({
      tenantId,
      assignedTo: userId,
      createdBy: userId,
      title: 'Send follow-up email',
      description: 'Send the custom clearance brochure.',
      relatedTo: { model: 'Lead', id: leads[0]._id, name: 'Rapid Freight' },
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority: 'high',
      status: 'open'
    });
    console.log('Created 1 Activity and 1 Task.');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('Validation Error Details:');
      for (let field in error.errors) {
        console.error(`- ${field}: ${error.errors[field].message}`);
      }
    } else {
      console.error('Error seeding data:', error);
    }
    process.exit(1);
  }
}

seed();
