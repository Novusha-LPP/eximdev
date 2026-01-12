import mongoose from "mongoose";
import { createDynamicModel } from "../utils/modelHelper.mjs";

// Schema to maintain unique user IDs for audit trail
const userMappingSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Update lastUsed whenever accessed
userMappingSchema.pre('save', function (next) {
  this.lastUsed = new Date();
  next();
});

const UserMappingModel = createDynamicModel("UserMapping", userMappingSchema, "AHMEDABAD HO");
export default UserMappingModel;
