import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.PROD_MONGODB_URI || "mongodb://localhost:27017/exim")
  .then(async () => {
    const employee = await mongoose.connection.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6672a2501aa931b68b091fb6') });
    console.log("Employee shift_id:", employee?.shift_id);
    console.log("Employee shift_ids:", employee?.shift_ids);
    console.log("Employee company_id:", employee?.company_id);
    mongoose.connection.close();
  })
  .catch(console.error);
