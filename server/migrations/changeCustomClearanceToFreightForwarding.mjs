import mongoose from "mongoose";
import dotenv from "dotenv";

import AccountModel from "../model/crm/Account.mjs";
import ContactModel from "../model/crm/Contact.mjs";
import LeadModel from "../model/crm/Lead.mjs";
import OpportunityModel from "../model/crm/Opportunity.mjs";
import SalesTeamModel from "../model/crm/SalesTeam.mjs";

dotenv.config();

async function migrate() {
  try {
    console.log("Starting CRM migration: Customs Clearance -> Freight Forwarding...");

    const MONGODB_URI =
      process.env.MONGO_URI ||
      process.env.PROD_MONGODB_URI ||
      process.env.SERVER_MONGODB_URI ||
      process.env.DEV_MONGODB_URI;

    if (!MONGODB_URI) {
      console.error("No MongoDB URI found in environment variables.");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // 1. Account businessVertical update
    const accountsResult = await AccountModel.updateMany(
      { businessVertical: "Customs Clearance" },
      { $set: { businessVertical: "Freight Forwarding" } }
    );
    console.log(`Updated Accounts: ${accountsResult.modifiedCount}`);

    // 2. Contact businessVertical update
    const contactsResult = await ContactModel.updateMany(
      { businessVertical: "Customs Clearance" },
      { $set: { businessVertical: "Freight Forwarding" } }
    );
    console.log(`Updated Contacts: ${contactsResult.modifiedCount}`);

    // 3. SalesTeam businessVertical update
    const salesTeamsResult = await SalesTeamModel.updateMany(
      { businessVertical: "Customs Clearance" },
      { $set: { businessVertical: "Freight Forwarding" } }
    );
    console.log(`Updated SalesTeams: ${salesTeamsResult.modifiedCount}`);

    // 4. Lead updates: businessVertical and interestedServices
    // Update businessVertical
    const leadsVerticalResult = await LeadModel.updateMany(
      { businessVertical: "Customs Clearance" },
      { $set: { businessVertical: "Freight Forwarding" } }
    );
    console.log(`Updated Leads (businessVertical): ${leadsVerticalResult.modifiedCount}`);

    // Find leads with "custom clearance" in interestedServices
    const leadsWithService = await LeadModel.find({ interestedServices: "custom clearance" });
    let leadServiceUpdates = 0;
    for (const lead of leadsWithService) {
      // Filter out 'custom clearance'
      const servicesWithoutCustom = lead.interestedServices.filter(s => s !== "custom clearance");
      // Add 'freight forwarding' if not already present
      if (!servicesWithoutCustom.includes("freight forwarding")) {
        servicesWithoutCustom.push("freight forwarding");
      }
      lead.interestedServices = servicesWithoutCustom;
      await lead.save();
      leadServiceUpdates++;
    }
    console.log(`Updated Leads (interestedServices): ${leadServiceUpdates}`);

    // 5. Opportunity updates: businessVertical and services
    // Update businessVertical
    const opportunitiesVerticalResult = await OpportunityModel.updateMany(
      { businessVertical: "Customs Clearance" },
      { $set: { businessVertical: "Freight Forwarding" } }
    );
    console.log(`Updated Opportunities (businessVertical): ${opportunitiesVerticalResult.modifiedCount}`);

    // Find opportunities with "custom clearance" in services
    const opportunitiesWithService = await OpportunityModel.find({ services: "custom clearance" });
    let opportunityServiceUpdates = 0;
    for (const opp of opportunitiesWithService) {
      // Filter out 'custom clearance'
      const servicesWithoutCustom = opp.services.filter(s => s !== "custom clearance");
      // Add 'freight forwarding' if not already present
      if (!servicesWithoutCustom.includes("freight forwarding")) {
        servicesWithoutCustom.push("freight forwarding");
      }
      opp.services = servicesWithoutCustom;
      await opp.save();
      opportunityServiceUpdates++;
    }
    console.log(`Updated Opportunities (services): ${opportunityServiceUpdates}`);

    console.log("Migration completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

migrate();
