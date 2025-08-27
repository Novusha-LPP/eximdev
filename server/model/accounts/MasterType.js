// model/accounts/MasterType.js
import mongoose from 'mongoose';

const masterTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fields: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'upload', 'select', 'boolean'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    },
    options: [String] // For select type fields
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('MasterType', masterTypeSchema);
