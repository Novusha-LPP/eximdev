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
    console.log('📊 Database:', mongoUri.split('/').pop().split('?')[0]);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Update approval status from "Approved by HOD" to "Approved"
const updateApprovalStatus = async () => {
  try {
    console.log('🔍 Searching for records with "Approved by HOD" status...');
    
    // Find all records with "Approved by HOD" status
    const recordsToUpdate = await CustomerKycModel.find({ 
      approval: "Approved by HOD" 
    });
    
    console.log(`📊 Found ${recordsToUpdate.length} records with "Approved by HOD" status`);
    
    if (recordsToUpdate.length === 0) {
      console.log('✅ No records need updating');
      return;
    }
    
    // Show details of records that will be updated
    console.log('\n📋 Records to be updated:');
    recordsToUpdate.forEach((record, index) => {
      console.log(`${index + 1}. ${record.name_of_individual || 'N/A'} (ID: ${record._id}) - IEC: ${record.iec_no || 'N/A'}`);
    });
    
    // Update all records
    const updateResult = await CustomerKycModel.updateMany(
      { approval: "Approved by HOD" },
      { 
        $set: { 
          approval: "Approved"
        }
      }
    );
    
    
    // Verify the update
    const remainingRecords = await CustomerKycModel.find({ 
      approval: "Approved by HOD" 
    });
    
    if (remainingRecords.length === 0) {
      console.log('✅ Verification successful: No records with "Approved by HOD" status remain');
    } else {
      console.log(`⚠️  Warning: ${remainingRecords.length} records still have "Approved by HOD" status`);
    }
    
  } catch (error) {
    console.error('❌ Error updating records:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🚀 Starting approval status update process...\n');
  
  await connectDB();
  await updateApprovalStatus();
  
  console.log('\n🏁 Update process completed');
  await mongoose.connection.close();
  console.log('🔌 Database connection closed');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});
