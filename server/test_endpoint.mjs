import mongoose from 'mongoose';
import CustomerKycModel from './model/CustomerKyc/customerKycModel.mjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");
  const customers = await CustomerKycModel.find({ draft: { $ne: "true" } })
      .select("name_of_individual category approval iec_no udyam_no trainings")
      .sort({ name_of_individual: 1 })
      .lean();

  const aanav = customers.find(c => c.name_of_individual.includes("AANAV"));
  console.log("Aanav from find:", JSON.stringify(aanav, null, 2));

  const result = customers.map(c => {
      let udyam = c.udyam_no;
      if (!udyam || udyam.trim() === "") {
          const completedTraining = (c.trainings || []).find(t => t.training_status === "Completed");
          if (completedTraining) {
              udyam = completedTraining.training_code;
          }
      }
      return {
          _id: c._id,
          name_of_individual: c.name_of_individual,
          category: c.category,
          approval: c.approval,
          iec_no: c.iec_no,
          udyam_no: udyam
      };
  });

  const aanavResult = result.find(c => c.name_of_individual.includes("AANAV"));
  console.log("Aanav processed result:", JSON.stringify(aanavResult, null, 2));
  
  const registeredCount = result.filter(c => c.udyam_no && c.udyam_no.trim() !== "").length;
  console.log("Registered count:", registeredCount);

  mongoose.connection.close();
}

run().catch(console.error);
