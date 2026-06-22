/**
 * CRM Data Seed Migration
 * Purpose: Populate initial CRM data (Leads, Accounts, Contacts, Opportunities, Tasks, Teams) into database
 * Run once on database setup or when needed
 * 
 * Usage:
 * node server/migrations/seedCRMData.mjs
 */

import mongoose from "mongoose";
import Lead from "../model/crm/Lead.mjs";
import Account from "../model/crm/Account.mjs";
import Contact from "../model/crm/Contact.mjs";
import Opportunity from "../model/crm/Opportunity.mjs";
import Task from "../model/crm/Task.mjs";
import SalesTeam from "../model/crm/SalesTeam.mjs";
import User from "../model/userModel.mjs";
import Organization from "../model/crm/Organization.mjs";
import dotenv from "dotenv";

dotenv.config();

const allowedServices = [
  "custom clearance",
  "freight forwarding",
  "dgft",
  "e-lock",
  "client",
  "transportation",
  "paramount",
  "rabs",
  "auto rack"
];

const leadSources = ["web", "referral", "email", "social", "event"];
const leadStatuses = ["new", "contacted", "qualified", "unqualified", "converted"];
const grades = ["A", "B", "C", "D"];
const accountSizes = ["startup", "small", "medium", "large"];
const opportunityStages = ["lead", "qualified", "opportunity", "proposal", "negotiation", "won", "lost"];
const taskTypes = ["call", "email", "meeting", "research", "other"];
const taskStatuses = ["open", "in_progress", "completed", "cancelled"];
const taskPriorities = ["low", "medium", "high", "urgent"];

// Sample company names for export-import business
const companyNames = [
  "Global Trade Solutions",
  "Ocean Freight India",
  "Air Cargo Worldwide",
  "Logistics Pro",
  "Express Importers",
  "Cargo Masters",
  "Trade Bridge International",
  "Fast Clearance Pvt Ltd",
  "Shipping Solutions",
  "Container Logistics",
  "Export Hub India",
  "Import Direct",
  "Freight Connect",
  "Clearance Experts",
  "Supply Chain Pro",
  "Custom House Agents",
  "Sea World Logistics",
  "Air Bridge Cargo",
  "Transworld Freight",
  "Port to Port Solutions"
];

const firstNames = ["Rajesh", "Priya", "Amit", "Sneha", "Karthik", "Meera", "Suresh", "Neha", "Vikram", "Anjali", "Ravi", "Kavita", "Manoj", "Divya", "Arjun"];
const lastNames = ["Kumar", "Sharma", "Patel", "Desai", "Reddy", "Menon", "Singh", "Iyer", "Gupta", "Verma", "Mehta", "Jain", "Banerjee", "Chaudhary", "Mohan"];

const industries = ["Import/Export", "Manufacturing", "Logistics", "Textiles", "Engineering", "Pharmaceuticals", "Automotive", "Electronics", "Chemicals", "Food Processing"];

async function seedCRMData() {
  try {
    console.log("🌱 Starting CRM Data Seeding...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/eximdev";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Get first organization and user for seeding
    let organization = await Organization.findOne();
    if (!organization) {
      // Create a default organization if none exists
      organization = new Organization({
        name: "AlVision Exim",
        slug: "alvision-exim",
        plan: "enterprise",
        settings: {
          currency: "INR",
          timezone: "Asia/Kolkata"
        }
      });
      await organization.save();
      console.log("✅ Created default organization\n");
    }

    const users = await User.find({}).limit(3);
    if (users.length === 0) {
      console.error("❌ No users found. Please create users first.");
      process.exit(1);
    }

    const managerUser = users[0];
    const salesUsers = users.slice(0, Math.min(users.length, 3));

    console.log(`📋 Found ${users.length} users, will seed data for organization: ${organization.name}\n`);

    // Check if data already exists
    const existingLeads = await Lead.countDocuments({ ownerId: { $in: salesUsers.map(u => u._id) } });
    if (existingLeads > 0) {
      console.log(`⚠️  Found ${existingLeads} existing leads. Skipping seed.\n`);
      process.exit(0);
    }

    // ============================================
    // 1. CREATE SALES TEAMS
    // ============================================
    const seedTeams = [
      {
        name: "Export Sales Team",
        description: "Handling export business development",
        managerId: managerUser._id,
        memberIds: salesUsers.map(u => u._id),
        type: "regional",
        quotas: { monthlyRevenue: 5000000, quarterlyRevenue: 15000000, annualRevenue: 60000000, dealCount: 50 },
        performance: { currentRevenue: 3200000, currentDeals: 24, winRate: 25, avgDealSize: 133333 }
      },
      {
        name: "Import Solutions Team",
        description: "Managing import client relationships",
        managerId: managerUser._id,
        memberIds: salesUsers.slice(0, 2).map(u => u._id),
        type: "industry",
        quotas: { monthlyRevenue: 3000000, quarterlyRevenue: 9000000, annualRevenue: 36000000, dealCount: 30 },
        performance: { currentRevenue: 2100000, currentDeals: 18, winRate: 30, avgDealSize: 116666 }
      }
    ];

    const createdTeams = await SalesTeam.insertMany(seedTeams);
    console.log(`✅ Created ${createdTeams.length} sales teams:\n`);
    createdTeams.forEach((team, i) => {
      console.log(`  ${i + 1}. ${team.name} (${team.members?.length || team.memberIds?.length} members)`);
    });

    // ============================================
    // 2. CREATE SAMPLE LEADS
    // ============================================
    const seedLeads = [];
    for (let i = 0; i < 20; i++) {
      const company = companyNames[i % companyNames.length] + (i >= companyNames.length ? ` ${Math.floor(i / companyNames.length) + 1}` : "");
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      
      seedLeads.push({
        ownerId: salesUsers[i % salesUsers.length]._id,
        company,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+91 ${Math.floor(7000000000 + Math.random() * 3000000000)}`,
        status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
        interestedServices: [
          allowedServices[Math.floor(Math.random() * allowedServices.length)],
          allowedServices[Math.floor(Math.random() * allowedServices.length)]
        ].filter((v, i, arr) => arr.indexOf(v) === i), // unique values
        source: leadSources[Math.floor(Math.random() * leadSources.length)],
        score: Math.floor(Math.random() * 100),
        grade: grades[Math.floor(Math.random() * grades.length)],
        crateSize: ["20ft", "40ft", "40ft HQ", ""][Math.floor(Math.random() * 4)]
      });
    }

    const createdLeads = await Lead.insertMany(seedLeads);
    console.log(`\n✅ Created ${createdLeads.length} leads\n`);

    // ============================================
    // 3. CREATE SAMPLE ACCOUNTS
    // ============================================
    const seedAccounts = companyNames.slice(0, 10).map((name, i) => ({
      ownerId: salesUsers[i % salesUsers.length]._id,
      name,
      industry: industries[i % industries.length],
      size: accountSizes[Math.floor(Math.random() * accountSizes.length)],
      website: `https://${name.toLowerCase().replace(/\s+/g, "")}.com`,
      annualRevenue: [5000000, 10000000, 25000000, 50000000, 100000000][Math.floor(Math.random() * 5)],
      healthScore: Math.floor(Math.random() * 100),
      address: `${Math.floor(Math.random() * 1000) + 1} Business District, Mumbai, Maharashtra 400001`
    }));

    const createdAccounts = await Account.insertMany(seedAccounts);
    console.log(`✅ Created ${createdAccounts.length} accounts\n`);

    // ============================================
    // 4. CREATE SAMPLE CONTACTS
    // ============================================
    const seedContacts = [];
    createdAccounts.forEach((account, i) => {
      // Primary contact
      seedContacts.push({
        accountId: account._id,
        ownerId: account.ownerId,
        firstName: firstNames[i % firstNames.length],
        lastName: lastNames[(i + 5) % lastNames.length],
        email: `contact${i}@${account.name.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+91 ${Math.floor(9000000000 + Math.random() * 1000000000)}`,
        title: ["Director", "Manager", "CEO", "Operations Head", "Procurement Manager"][i % 5],
        isPrimary: true
      });
      
      // Secondary contact
      seedContacts.push({
        accountId: account._id,
        ownerId: account.ownerId,
        firstName: firstNames[(i + 7) % firstNames.length],
        lastName: lastNames[(i + 3) % lastNames.length],
        email: `secondary${i}@${account.name.toLowerCase().replace(/\s+/g, "")}.com`,
        phone: `+91 ${Math.floor(9000000000 + Math.random() * 1000000000)}`,
        title: ["Assistant Manager", "Senior Executive", "Sales Coordinator", "Admin Officer"][i % 4],
        isPrimary: false
      });
    });

    const createdContacts = await Contact.insertMany(seedContacts);
    console.log(`✅ Created ${createdContacts.length} contacts\n`);

    // ============================================
    // 5. CREATE SAMPLE OPPORTUNITIES
    // ============================================
    const seedOpportunities = [];
    for (let i = 0; i < 12; i++) {
      const account = createdAccounts[i % createdAccounts.length];
      const contact = createdContacts.find(c => c.accountId.toString() === account._id.toString() && c.isPrimary);
      const stage = opportunityStages[i % opportunityStages.length];
      
      seedOpportunities.push({
        accountId: account._id,
        primaryContactId: contact?._id,
        ownerId: account.ownerId,
        name: `${account.name} - Q${Math.floor(i / 4) + 1} Opportunity`,
        value: [100000, 250000, 500000, 750000, 1000000, 1500000, 2000000][Math.floor(Math.random() * 7)],
        stage,
        forecastCategory: stage === "won" || stage === "lost" ? "closed" : ["pipeline", "best_case", "commit"][Math.floor(Math.random() * 3)],
        services: [allowedServices[Math.floor(Math.random() * allowedServices.length)]],
        expectedCloseDate: new Date(Date.now() + (Math.floor(Math.random() * 90) + 1) * 24 * 60 * 60 * 1000),
        probability: stage === "won" ? 100 : stage === "lost" ? 0 : [10, 25, 50, 75, 90][Math.floor(Math.random() * 5)],
        stageHistory: [{
          stage,
          enteredAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        }]
      });
    }

    const createdOpportunities = await Opportunity.insertMany(seedOpportunities);
    console.log(`✅ Created ${createdOpportunities.length} opportunities\n`);

    // ============================================
    // 6. CREATE SAMPLE TASKS
    // ============================================
    const seedTasks = [
      {
        title: "Follow up with Global Trade Solutions",
        description: "Call to discuss upcoming shipment requirements",
        priority: "high",
        status: "open",
        type: "call",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[0]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "Global Trade Solutions", model: "Account" }
      },
      {
        title: "Send proposal to Ocean Freight India",
        description: "Email proposal for freight forwarding services",
        priority: "high",
        status: "in_progress",
        type: "email",
        dueDate: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[0]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "Ocean Freight India", model: "Account" }
      },
      {
        title: "Schedule meeting with Air Cargo Worldwide",
        description: "Meeting with logistics head to discuss partnership",
        priority: "medium",
        status: "open",
        type: "meeting",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[1]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "Air Cargo Worldwide", model: "Account" }
      },
      {
        title: "Prepare contract for Logistics Pro",
        description: "Draft new service agreement",
        priority: "medium",
        status: "open",
        type: "other",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[1]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "Logistics Pro", model: "Account" }
      },
      {
        title: "Market research on competitors",
        description: "Analyze competitor pricing for custom clearance",
        priority: "low",
        status: "completed",
        type: "research",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[2]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "General", model: "Research" }
      },
      {
        title: "Update opportunity status",
        description: "Log progress on Express Importers deal",
        priority: "medium",
        status: "open",
        type: "other",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: salesUsers[2]._id,
        createdBy: managerUser._id,
        relatedTo: { name: "Express Importers", model: "Account" }
      }
    ];

    const createdTasks = await Task.insertMany(seedTasks);
    console.log(`✅ Created ${createdTasks.length} tasks\n`);

    // Summary
    console.log("📊 Seeding Summary:");
    console.log(`  • ${createdTeams.length} Sales Teams`);
    console.log(`  • ${createdLeads.length} Leads`);
    console.log(`  • ${createdAccounts.length} Accounts`);
    console.log(`  • ${createdContacts.length} Contacts`);
    console.log(`  • ${createdOpportunities.length} Opportunities`);
    console.log(`  • ${createdTasks.length} Tasks`);
    console.log("\n✅ Seeding completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedCRMData();