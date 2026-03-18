import mongoose from 'mongoose';

const territorySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String },
  
  // Territory type
  type: { 
    type: String, 
    enum: ['geographic', 'industry', 'customer-size', 'product', 'channel'],
    default: 'geographic'
  },
  
  // Geographic boundaries (if type is geographic)
  boundaries: {
    countries: [String],
    states: [String],
    cities: [String],
    regions: [String]
  },
  
  // Industry or segment (if applicable)
  industries: [String],
  
  // Customer size targeting
  customerSize: {
    type: [String],
    enum: ['startup', 'small', 'medium', 'large', 'enterprise']
  },
  
  // Assignment
  assignedTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesTeam' },
  assignedOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Territory members (secondary)
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Capacity
  maxAccounts: { type: Number },
  maxLeads: { type: Number },
  currentAccountCount: { type: Number, default: 0 },
  currentLeadCount: { type: Number, default: 0 },
  
  // Routing rules
  leadRoutingRules: {
    autoAssign: { type: Boolean, default: true },
    roundRobin: { type: Boolean, default: false },
    skillBased: { type: Boolean, default: false },
    requiredSkills: [String]
  },
  
  // Performance metrics
  metrics: {
    totalRevenue: { type: Number, default: 0 },
    totalDeals: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgDealSize: { type: Number, default: 0 }
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
territorySchema.index({ tenantId: 1, name: 1 });
territorySchema.index({ tenantId: 1, type: 1 });
territorySchema.index({ assignedTeamId: 1 });
territorySchema.index({ assignedOwnerId: 1 });

export default mongoose.model('Territory', territorySchema);
