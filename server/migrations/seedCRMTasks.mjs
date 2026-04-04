/**
 * CRM Tasks Seed Migration
 * Purpose: Populate initial CRM tasks into database
 * Run once on database setup or when needed
 * 
 * Usage:
 * node server/migrations/seedCRMTasks.mjs
 */

import mongoose from "mongoose";
import Task from "../model/crm/Task.mjs";
import User from "../model/user.mjs";
import Organization from "../model/organization.mjs";
import dotenv from "dotenv";

dotenv.config();

async function seedTasks() {
  try {
    console.log("🌱 Starting CRM Tasks Seeding...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eximdev");
    console.log("✅ Connected to MongoDB\n");

    // Get first organization and user for seeding
    const organization = await Organization.findOne();
    if (!organization) {
      console.error("❌ No organization found. Please create an organization first.");
      process.exit(1);
    }

    const user = await User.findOne({ organization: organization._id });
    if (!user) {
      console.error("❌ No user found for organization. Please create a user first.");
      process.exit(1);
    }

    // Check if tasks already exist
    const existingTasks = await Task.countDocuments({ tenantId: organization._id });
    if (existingTasks > 0) {
      console.log(`⚠️  Found ${existingTasks} existing tasks. Skipping seed.\n`);
      process.exit(0);
    }

    const seedTasks = [
      {
        title: 'Follow up with TechCorp',
        description: 'Call to discuss demo and schedule next steps',
        priority: 'high',
        status: 'open',
        type: 'call',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'TechCorp Inc',
          model: 'Account'
        }
      },
      {
        title: 'Send proposal to FinanceFirst',
        description: 'Email proposal for banking solution',
        priority: 'high',
        status: 'in_progress',
        type: 'email',
        dueDate: new Date(Date.now() + 0 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'FinanceFirst Bank',
          model: 'Account'
        }
      },
      {
        title: 'Schedule meeting with Innovate',
        description: 'Meeting with CEO and CTO to discuss requirements',
        priority: 'medium',
        status: 'open',
        type: 'meeting',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'Innovate Solutions',
          model: 'Account'
        }
      },
      {
        title: 'Prepare contract for Global Systems',
        description: 'Draft contract terms and send for review',
        priority: 'medium',
        status: 'open',
        type: 'other',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'Global Systems',
          model: 'Account'
        }
      },
      {
        title: 'Market research on competitors',
        description: 'Analyze competitor offerings and pricing',
        priority: 'low',
        status: 'completed',
        type: 'research',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'General',
          model: 'Research'
        }
      },
      {
        title: 'Update opportunity status',
        description: 'Log progress on Enterprise Inc deal',
        priority: 'medium',
        status: 'open',
        type: 'other',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        assignedTo: user._id,
        createdBy: user._id,
        relatedTo: {
          name: 'Enterprise Inc',
          model: 'Account'
        }
      }
    ];

    // Add tenantId to all tasks
    const tasksWithTenant = seedTasks.map(task => ({
      ...task,
      tenantId: organization._id
    }));

    // Insert tasks
    const result = await Task.insertMany(tasksWithTenant);
    console.log(`✅ Successfully seeded ${result.length} tasks\n`);

    console.log("📋 Seeded Tasks:");
    result.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title} (${task.status})`);
    });

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedTasks();
