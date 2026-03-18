/**
 * CRM Phase 1 Collections and Indexes Migration
 * Purpose: Create collections and indexes for new CRM features
 * - Lead Scoring System
 * - Territory Management
 * - Sales Team Management
 * - Quote Management
 * - Automation Rules
 * - Revenue Forecasting
 * 
 * Usage:
 * node server/migrations/createCRMPhase1Collections.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadScoreModel from "../model/crm/LeadScore.mjs";
import TerritoryModel from "../model/crm/Territory.mjs";
import SalesTeamModel from "../model/crm/SalesTeam.mjs";
import QuoteModel from "../model/crm/Quote.mjs";
import AutomationRuleModel from "../model/crm/AutomationRule.mjs";
import OpportunityForecastModel from "../model/crm/OpportunityForecast.mjs";

dotenv.config();

async function createCRMCollections() {
  try {
    console.log("🔧 Starting CRM Phase 1 Collections and Indexes Setup...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/eximdev";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // ========================
    // LEAD SCORE COLLECTION
    // ========================
    console.log("📍 Setting up LeadScore collection and indexes...");
    try {
      // Ensure collection exists
      await LeadScoreModel.collection.createIndex({ tenantId: 1, leadId: 1 }, { unique: true });
      console.log("✅ Index created: { tenantId: 1, leadId: 1 } (unique)");
      
      await LeadScoreModel.collection.createIndex({ tenantId: 1, totalScore: -1 });
      console.log("✅ Index created: { tenantId: 1, totalScore: -1 }");
      
      await LeadScoreModel.collection.createIndex({ tenantId: 1, grade: 1 });
      console.log("✅ Index created: { tenantId: 1, grade: 1 }");
      
      await LeadScoreModel.collection.createIndex({ tenantId: 1, isQualified: 1 });
      console.log("✅ Index created: { tenantId: 1, isQualified: 1 }");
      
      await LeadScoreModel.collection.createIndex({ tenantId: 1, createdAt: -1 });
      console.log("✅ Index created: { tenantId: 1, createdAt: -1 }\n");
    } catch (err) {
      console.log("⚠️  LeadScore indexes status:", err.message, "\n");
    }

    // ========================
    // TERRITORY COLLECTION
    // ========================
    console.log("📍 Setting up Territory collection and indexes...");
    try {
      await TerritoryModel.collection.createIndex({ tenantId: 1, name: 1 }, { unique: true });
      console.log("✅ Index created: { tenantId: 1, name: 1 } (unique)");
      
      await TerritoryModel.collection.createIndex({ tenantId: 1, type: 1 });
      console.log("✅ Index created: { tenantId: 1, type: 1 }");
      
      await TerritoryModel.collection.createIndex({ tenantId: 1, assignedTeamId: 1 });
      console.log("✅ Index created: { tenantId: 1, assignedTeamId: 1 }");
      
      await TerritoryModel.collection.createIndex({ tenantId: 1, isActive: 1 });
      console.log("✅ Index created: { tenantId: 1, isActive: 1 }\n");
    } catch (err) {
      console.log("⚠️  Territory indexes status:", err.message, "\n");
    }

    // ========================
    // SALES TEAM COLLECTION
    // ========================
    console.log("📍 Setting up SalesTeam collection and indexes...");
    try {
      await SalesTeamModel.collection.createIndex({ tenantId: 1, name: 1 }, { unique: true });
      console.log("✅ Index created: { tenantId: 1, name: 1 } (unique)");
      
      await SalesTeamModel.collection.createIndex({ tenantId: 1, managerId: 1 });
      console.log("✅ Index created: { tenantId: 1, managerId: 1 }");
      
      await SalesTeamModel.collection.createIndex({ tenantId: 1, type: 1 });
      console.log("✅ Index created: { tenantId: 1, type: 1 }");
      
      await SalesTeamModel.collection.createIndex({ tenantId: 1, isActive: 1 });
      console.log("✅ Index created: { tenantId: 1, isActive: 1 }\n");
    } catch (err) {
      console.log("⚠️  SalesTeam indexes status:", err.message, "\n");
    }

    // ========================
    // QUOTE COLLECTION
    // ========================
    console.log("📍 Setting up Quote collection and indexes...");
    try {
      await QuoteModel.collection.createIndex({ tenantId: 1, quoteNumber: 1 }, { unique: true });
      console.log("✅ Index created: { tenantId: 1, quoteNumber: 1 } (unique)");
      
      await QuoteModel.collection.createIndex({ tenantId: 1, opportunityId: 1 });
      console.log("✅ Index created: { tenantId: 1, opportunityId: 1 }");
      
      await QuoteModel.collection.createIndex({ tenantId: 1, accountId: 1 });
      console.log("✅ Index created: { tenantId: 1, accountId: 1 }");
      
      await QuoteModel.collection.createIndex({ tenantId: 1, status: 1 });
      console.log("✅ Index created: { tenantId: 1, status: 1 }");
      
      await QuoteModel.collection.createIndex({ tenantId: 1, createdAt: -1 });
      console.log("✅ Index created: { tenantId: 1, createdAt: -1 }\n");
    } catch (err) {
      console.log("⚠️  Quote indexes status:", err.message, "\n");
    }

    // ========================
    // AUTOMATION RULE COLLECTION
    // ========================
    console.log("📍 Setting up AutomationRule collection and indexes...");
    try {
      await AutomationRuleModel.collection.createIndex({ tenantId: 1, name: 1 });
      console.log("✅ Index created: { tenantId: 1, name: 1 }");
      
      await AutomationRuleModel.collection.createIndex({ tenantId: 1, isActive: 1 });
      console.log("✅ Index created: { tenantId: 1, isActive: 1 }");
      
      await AutomationRuleModel.collection.createIndex({ tenantId: 1, trigger: 1 });
      console.log("✅ Index created: { tenantId: 1, trigger: 1 }");
      
      await AutomationRuleModel.collection.createIndex({ tenantId: 1, isTemplate: 1 });
      console.log("✅ Index created: { tenantId: 1, isTemplate: 1 }\n");
    } catch (err) {
      console.log("⚠️  AutomationRule indexes status:", err.message, "\n");
    }

    // ========================
    // OPPORTUNITY FORECAST COLLECTION
    // ========================
    console.log("📍 Setting up OpportunityForecast collection and indexes...");
    try {
      await OpportunityForecastModel.collection.createIndex({ tenantId: 1, opportunityId: 1, forecastMonth: 1 }, { unique: true });
      console.log("✅ Index created: { tenantId: 1, opportunityId: 1, forecastMonth: 1 } (unique)");
      
      await OpportunityForecastModel.collection.createIndex({ tenantId: 1, forecastMonth: 1 });
      console.log("✅ Index created: { tenantId: 1, forecastMonth: 1 }");
      
      await OpportunityForecastModel.collection.createIndex({ tenantId: 1, stage: 1 });
      console.log("✅ Index created: { tenantId: 1, stage: 1 }");
      
      await OpportunityForecastModel.collection.createIndex({ tenantId: 1, ownerId: 1 });
      console.log("✅ Index created: { tenantId: 1, ownerId: 1 }\n");
    } catch (err) {
      console.log("⚠️  OpportunityForecast indexes status:", err.message, "\n");
    }

    console.log("✅ ✅ ✅ CRM Phase 1 Collections Setup Complete! ✅ ✅ ✅\n");
    console.log("📊 Collections created:");
    console.log("  • LeadScore (lead qualification scoring)");
    console.log("  • Territory (geographic/industry/product territories)");
    console.log("  • SalesTeam (sales team hierarchy and quotas)");
    console.log("  • Quote (quote/proposal management)");
    console.log("  • AutomationRule (workflow automation rules)");
    console.log("  • OpportunityForecast (revenue forecasting)\n");

    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed\n");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

createCRMCollections();
