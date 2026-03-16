import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  title: { type: String },
  isPrimary: { type: Boolean, default: false },
  tags: [{ type: String }],
  convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);
