import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  partner_type: {
    type: String,
    required: true,
    enum: [
      'CFS',
      'Automotive tape brand',
      'Labour contractor',
      'Security contractor',
      'Palletisation supplier',
      'Wooden pallet supplier',
      'Fumigation supplier',
      'Insurance dealer',
      'CA',
      'ERP reseller',
      'Industry association',
      'Other'
    ],
    index: true
  },
  office: {
    type: String,
    enum: ['Gandhidham', 'Hazira', 'Cochin', 'Ahmedabad', 'Baroda', 'Rajkot', 'Jaipur', 'All', null],
    default: null,
    index: true
  },
  contact_person: { type: String, trim: true },
  contact_phone: { type: String, trim: true },
  contact_email: { type: String, trim: true, lowercase: true },
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

export default mongoose.model('CrmPartner', partnerSchema, 'crm_partners');
