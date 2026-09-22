import mongoose from 'mongoose';

const brochureFileSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  fileUrl: { type: String, required: true },
  fileKey: { type: String },
  fileSize: { type: Number, default: 0 },
  fileType: { type: String, default: 'pdf' }, // pdf, docx, pptx, image, etc.
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: 'kinjal_khatri' }
}, { _id: true });

const videoLinkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  platform: { 
    type: String, 
    enum: ['YouTube', 'Vimeo', 'Google Drive', 'Direct Video', 'Other'],
    default: 'YouTube' 
  },
  description: { type: String, trim: true },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: String, default: 'kinjal_khatri' }
}, { _id: true });

const companyBrochureSchema = new mongoose.Schema({
  companyName: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account',
    default: null 
  },
  industry: { type: String, trim: true },
  description: { type: String, trim: true },
  brochures: [brochureFileSchema],
  videoLinks: [videoLinkSchema],
  tags: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: 'kinjal_khatri' },
  updatedBy: { type: String, default: 'kinjal_khatri' }
}, { 
  timestamps: true 
});

companyBrochureSchema.index({ companyName: 'text', description: 'text', tags: 'text' });

export default mongoose.model('CompanyBrochure', companyBrochureSchema);
