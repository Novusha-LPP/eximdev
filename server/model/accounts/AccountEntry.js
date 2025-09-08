// model/accounts/AccountEntry.js
import mongoose from 'mongoose';

const accountEntrySchema = new mongoose.Schema({
  masterTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterType',
    required: true
  },
  masterTypeName: {
    type: String,
    required: true
  },
  defaultFields: {
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    billingDate: {
      type: Date
    },
    dueDate: {
      type: Date
    },
    reminder: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'],
      default: 'monthly'
    }
  },
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed // Can store any type of value
    },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'email', 'phone', 'upload',  'select', 'boolean'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AccountEntry', accountEntrySchema);
