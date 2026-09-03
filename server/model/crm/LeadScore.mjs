import mongoose from 'mongoose';

const leadScoreSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  baseScore: { type: Number, default: 0, min: 0, max: 100 },
  activityScore: { type: Number, default: 0, min: 0, max: 100 },
  sourceScore: { type: Number, default: 0, min: 0, max: 100 },
  engagementScore: { type: Number, default: 0, min: 0, max: 100 },
  totalScore: { type: Number, default: 0, min: 0, max: 100 },
  
  // Scoring factors
  leadSource: { type: String }, // Web, Email, Phone, Referral, Event, Social
  companySize: { type: String }, // Small, Medium, Large, Enterprise
  industry: { type: String },
  location: { type: String },
  
  // Activity factors
  emailOpens: { type: Number, default: 0 },
  emailClicks: { type: Number, default: 0 },
  pageViews: { type: Number, default: 0 },
  formSubmissions: { type: Number, default: 0 },
  callDuration: { type: Number, default: 0 }, // in seconds
  meetingAttended: { type: Boolean, default: false },
  
  // Qualification
  grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'C' }, // A=Excellent, B=Good, C=Fair, D=Poor
  isQualified: { type: Boolean, default: false },
  qualificationReason: { type: String },
  
  // Rules applied
  rulesApplied: [{ type: String }], // Track which rules increased/decreased score
  
  lastCalculated: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for quick lookups
leadScoreSchema.index({ leadId: 1 });
leadScoreSchema.index({ totalScore: -1 });
leadScoreSchema.index({ grade: 1 });

export default mongoose.model('LeadScore', leadScoreSchema);
