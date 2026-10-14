import mongoose from 'mongoose';

const hrmsSyncEventLogSchema = new mongoose.Schema({
  eventId: { type: String },
  eventType: { type: String, required: true },
  employmentId: { type: String },
  externalId: { type: String },
  occurredAt: { type: Date },
  processedAt: { type: Date, default: Date.now },
  outcome: { type: String, enum: ['APPLIED', 'LINKED', 'SKIPPED', 'FAILED'], default: 'APPLIED' },
  error: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const hrmsSyncStateSchema = new mongoose.Schema({
  systemCode: {
    type: String,
    required: true,
    unique: true,
    default: 'EXIM',
  },
  lastCursor: {
    type: String,
    default: 'c_000000000000',
  },
  lastPolledAt: {
    type: Date,
    default: null,
  },
  lastSuccessAt: {
    type: Date,
    default: null,
  },
  lastError: {
    type: String,
    default: null,
  },
  totalPolls: {
    type: Number,
    default: 0,
  },
  totalEventsProcessed: {
    type: Number,
    default: 0,
  },
  recentEvents: {
    type: [hrmsSyncEventLogSchema],
    default: [],
  },
  lastReconcile: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
}, { timestamps: true });

const HrmsSyncState = mongoose.models.HrmsSyncState || mongoose.model('HrmsSyncState', hrmsSyncStateSchema);
export default HrmsSyncState;
