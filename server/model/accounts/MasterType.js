import mongoose from 'mongoose';
import auditPlugin from "../../plugins/auditPlugin.mjs";

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

masterTypeSchema.plugin(auditPlugin, { documentType: "MasterType" });

const MasterTypeModel = mongoose.model('MasterType', masterTypeSchema);
export default MasterTypeModel;
