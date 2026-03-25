import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  relatedTo: {
    model: { type: String, enum: ['Lead', 'Contact', 'Opportunity'], required: true },
    id: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  type: { 
    type: String, 
    enum: ['call', 'email', 'meeting', 'demo', 'note'], 
    required: true 
  },
  subject: { type: String, required: true },
  description: { type: String },
  duration: { type: Number },
  activityDate: { type: Date, default: Date.now },
  outcome: { 
    type: String, 
    enum: ['positive', 'neutral', 'negative'] 
  },
  nextSteps: { type: String }
}, { timestamps: true });

export default mongoose.model('Activity', activitySchema);
