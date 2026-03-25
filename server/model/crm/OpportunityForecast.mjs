import mongoose from 'mongoose';

const opportunityForecastSchema = new mongoose.Schema({
  opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  
  // Forecast period
  forecastMonth: { type: Date, required: true }, // First day of the month
  forecastQuarter: String, // Q1-Q4
  forecastYear: Number,
  
  // Opportunity details at time of forecast
  opportunityName: String,
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  stage: { type: String, required: true },
  
  // Forecast values
  baseValue: { type: Number, required: true }, // Opportunity value
  probability: { type: Number, required: true, min: 0, max: 100 }, // Win probability
  expectedValue: { type: Number, required: true }, // baseValue * (probability/100)
  
  // Weighted forecast (for executive view)
  weightedValue: { type: Number, required: true }, // expectedValue with additional adjustments
  
  // Probability factors
  probabilityFactors: {
    stageProbability: { type: Number, default: 0 }, // Default probability for the stage
    customProbability: { type: Number }, // Override if manually set
    historicalWinRate: { type: Number }, // Based on historical data
    competitionLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    buyingSignals: { type: Number, default: 0 }, // 0-100 strength of signals
    decisionTimelineRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  
  // Best case / Worst case scenarios
  scenarios: {
    bestCase: {
      value: Number,
      probability: Number,
      description: String
    },
    baseCase: {
      value: { type: Number, required: true },
      probability: { type: Number, required: true }
    },
    worstCase: {
      value: Number,
      probability: Number,
      description: String
    }
  },
  
  // Forecast adjustments
  adjustments: [{
    factor: String, // 'competition', 'timeline_risk', 'buying_signals', 'budget_approval'
    adjustment: Number, // -/+ percentage adjustment
    reason: String
  }],
  
  // Forecast accuracy tracking
  accuracy: {
    actualValue: Number, // Set when deal closes
    actualOutcome: { type: String, enum: ['won', 'lost', 'pending'] },
    closedAt: Date,
    variance: Number, // actualValue - expectedValue
    variancePercent: Number
  },
  
  // Historical comparisons
  previousForecast: { type: mongoose.Schema.Types.ObjectId, ref: 'OpportunityForecast' },
  valueChange: Number,
  probabilityChange: Number,
  
  // Aging & alerts
  stageEnteredDate: Date,
  daysSinceStageEntry: Number,
  isAged: { type: Boolean, default: false }, // > 30/60/90 days in stage
  ageCategory: { type: String, enum: ['current', '30_days', '60_days', '90_plus_days'] },
  
  // Flag status
  isFlagged: { type: Boolean, default: false },
  flagReason: String,
  
  // Owner & assignment
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesTeam' },
  
  forecastedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forecastedAt: { type: Date, default: Date.now },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for fast querying
opportunityForecastSchema.index({ forecastMonth: -1 });
opportunityForecastSchema.index({ opportunityId: 1 });
opportunityForecastSchema.index({ ownerId: 1, forecastMonth: -1 });
opportunityForecastSchema.index({ teamId: 1, forecastMonth: -1 });
opportunityForecastSchema.index({ stage: 1, forecastMonth: -1 });
opportunityForecastSchema.index({ forecastMonth: 1 });

export default mongoose.model('OpportunityForecast', opportunityForecastSchema);
