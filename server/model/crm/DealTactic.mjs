import mongoose from 'mongoose';

const dealTacticSchema = new mongoose.Schema({
  deal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true,
    index: true
  },
  tactic_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tactic',
    required: true,
    index: true
  },
  tactic_code: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  added_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  added_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  deal_status_when_added: {
    type: String,
    required: true
  },
  result: {
    type: String,
    enum: ['worked', 'did_not_work', 'not_used', null],
    default: null,
    index: true
  },
  result_note: {
    type: String,
    trim: true,
    default: null
  },
  result_set_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  result_set_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

dealTacticSchema.index({ deal_id: 1, tactic_id: 1 }, { unique: true });
dealTacticSchema.index({ tactic_id: 1, result: 1 });

export default mongoose.model('DealTactic', dealTacticSchema, 'crm_deal_tactics');
