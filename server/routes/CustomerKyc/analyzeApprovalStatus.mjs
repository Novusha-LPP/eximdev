import mongoose from 'mongoose';
import CustomerKycModel from "../../model/CustomerKyc/customerKycModel.mjs";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('📡 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Check approval status distribution
const checkApprovalStatuses = async () => {
  try {
    console.log('🔍 Analyzing approval status distribution...\n');
    
    // Get all non-draft records (what Customer KYC Status shows)
    const allNonDrafts = await CustomerKycModel.find({ 
      draft: { $ne: "true" } 
    }).select('approval draft');
    
    console.log(`📊 Total non-draft records (Customer KYC Status): ${allNonDrafts.length}`);
    
    // Group by approval status
    const statusCounts = {};
    allNonDrafts.forEach(record => {
      const status = record.approval || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('📋 Breakdown by approval status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} records`);
    });
    
    // Get HOD pending records
    const hodPending = await CustomerKycModel.find({ 
      approval: "Pending" 
    }).select('approval draft');
    
    console.log(`\n🏛️  HOD Approval Pending records: ${hodPending.length}`);
    
    // Check if there are any draft records with "Pending" status
    const draftPending = await CustomerKycModel.find({ 
      approval: "Pending",
      draft: "true"
    }).select('approval draft');
    
    if (draftPending.length > 0) {
      console.log(`⚠️  Draft records with "Pending" status: ${draftPending.length}`);
    }
    
    // Show some sample records for verification
    console.log('\n📄 Sample records:');
    const sampleRecords = await CustomerKycModel.find({ 
      draft: { $ne: "true" } 
    }).select('name_of_individual approval draft').limit(5);
    
    sampleRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.name_of_individual} - Status: ${record.approval} - Draft: ${record.draft}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing data:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🔍 Customer KYC Status Analysis\n');
  
  await connectDB();
  await checkApprovalStatuses();
  
  console.log('\n✅ Analysis completed');
  await mongoose.connection.close();
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});
