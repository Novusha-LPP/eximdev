import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';
await mongoose.connect(uri);

const UserModel = mongoose.model('User', new mongoose.Schema({
  username: String,
  modules: Array,
  role: String
}, { collection: 'users' }));

const users = await UserModel.find({
  username: { $in: ['masood_raza', 'krupali_busa', 'suraj_rajan', 'almlcv', 'admin'] }
});

console.log(JSON.stringify(users.map(u => ({
  username: u.username,
  role: u.role,
  modules: u.modules
})), null, 2));

process.exit(0);
