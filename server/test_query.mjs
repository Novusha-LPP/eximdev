import mongoose from 'mongoose';
import CustomerKycModel from './model/CustomerKyc/customerKycModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function run() {
  console.log("Connecting to:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");
  
  const allCount = await CustomerKycModel.countDocuments({});
  const nonDraftCount = await CustomerKycModel.countDocuments({ draft: { $ne: "true" } });
  
  console.log("All Customers Count:", allCount);
  console.log("Non-Draft Customers Count:", nonDraftCount);
  
  const customers = await CustomerKycModel.find({ draft: { $ne: "true" } })
    .select("name_of_individual iec_no udyam_no trainings")
    .lean();
    
  const udyamFromField = customers.filter(c => c.udyam_no && c.udyam_no.trim() !== "");
  console.log("Customers with udyam_no field populated:", udyamFromField.length);
  
  const udyamFromTrainings = customers.filter(c => {
    if (c.udyam_no && c.udyam_no.trim() !== "") return true;
    const completed = (c.trainings || []).find(t => t.training_status === "Completed");
    return !!completed;
  });
  console.log("Customers with udyam_no OR completed training:", udyamFromTrainings.length);
  
  const aanav = customers.find(c => c.name_of_individual.includes("AANAV"));
  console.log("AANAV details in DB query:", JSON.stringify(aanav, null, 2));

  mongoose.connection.close();
}

run().catch(console.error);
