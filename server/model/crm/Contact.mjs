import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  phone: { type: String },
  title: { type: String },
  isPrimary: { type: Boolean, default: false },
  tags: [{ type: String }],
  convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  period: { type: String, default: () => new Date().toISOString().substring(0, 7) }
}, { timestamps: true });

export default mongoose.model('Contact', contactSchema);
