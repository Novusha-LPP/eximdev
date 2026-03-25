import mongoose from 'mongoose';

const salesTeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  
  // Team hierarchy
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesTeam' }, // For sub-teams
  
  // Team members
  memberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Team structure
  type: {
    type: String,
    enum: ['regional', 'product', 'industry', 'enterprise', 'channel'],
    default: 'regional'
  },
  
  // Territory assignment
  assignedTerritories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Territory' }],
  
  // Quota & Performance
  quotas: {
    monthlyRevenue: { type: Number, default: 0 },
    quarterlyRevenue: { type: Number, default: 0 },
    annualRevenue: { type: Number, default: 0 },
    dealCount: { type: Number, default: 0 }
  },
  
  performance: {
    currentRevenue: { type: Number, default: 0 },
    currentDeals: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgDealSize: { type: Number, default: 0 },
    salesCycleLength: { type: Number, default: 0 } // in days
  },
  
  // Team settings
  leadDistribution: {
    roundRobin: { type: Boolean, default: true },
    skillBased: { type: Boolean, default: false },
    workloadBalanced: { type: Boolean, default: true }
  },
  
  // Permissions
  permissions: [String], // e.g., 'can_manage_leads', 'can_approve_quotes'
  
  isActive: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
salesTeamSchema.index({ tenantId: 1, name: 1 });
salesTeamSchema.index({ managerId: 1 });
salesTeamSchema.index({ parentTeamId: 1 });
salesTeamSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model('SalesTeam', salesTeamSchema);
