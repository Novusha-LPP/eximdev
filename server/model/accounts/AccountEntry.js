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
    phoneNumber: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number
    },
    description: {
      type: String
    },
    documents: [{
      type: String // S3 URLs
    }],
    isPaid: {
      type: Boolean,
      default: false
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'overdue'],
      default: 'unpaid'
    },
    paymentDate: {
      type: Date
    }
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

export default mongoose.model('AccountEntry', accountEntrySchema);
