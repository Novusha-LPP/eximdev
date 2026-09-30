import mongoose from 'mongoose';

const crmDesignRequestSchema = new mongoose.Schema({
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
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  requestType: {
    type: String,
    enum: [
      'Brochure Design',
      'Brochure Update / Design Change',
      'Video Editing',
      'Product Presentation / Deck',
      'Flyer / Poster',
      'Social Media Creative',
      'Other'
    ],
    default: 'Brochure Design'
  },
  description: { 
    type: String, 
    required: true, 
    trim: true 
  },
  priority: {
    type: String,
    enum: ['Urgent', 'High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed', 'Changes Requested', 'Closed'],
    default: 'Pending',
    index: true
  },
  neededByDate: { 
    type: Date, 
    default: null 
  },
  referenceAttachments: [{
    name: { type: String, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, default: 'file' },
    fileSize: { type: Number, default: 0 }
  }],
  requestedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, trim: true },
    fullName: { type: String, trim: true },
    role: { type: String, trim: true }
  },
  assignedTo: {
    username: { type: String, default: 'kinjal_khatri' },
    fullName: { type: String, default: 'Kinjal Khatri' }
  },
  completedDesign: {
    designTitle: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    files: [{
      name: { type: String, trim: true },
      url: { type: String, trim: true },
      fileType: { type: String, default: 'pdf' }
    }],
    videoLinks: [{
      title: { type: String, trim: true },
      url: { type: String, trim: true },
      platform: { type: String, default: 'YouTube' }
    }],
    remarks: { type: String, trim: true },
    completedAt: { type: Date },
    completedBy: { type: String, default: 'kinjal_khatri' }
  },
  publishedToBrochures: { 
    type: Boolean, 
    default: false 
  },
  remarks: { 
    type: String, 
    trim: true 
  }
}, { 
  timestamps: true 
});

crmDesignRequestSchema.index({ companyName: 'text', title: 'text', description: 'text' });

export default mongoose.model('CrmDesignRequest', crmDesignRequestSchema);
