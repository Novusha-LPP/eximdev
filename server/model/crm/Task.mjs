import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['call', 'email', 'meeting', 'research', 'other'], 
    default: 'other' 
  },
  relatedTo: {
    name: { type: String },
    model: { type: String },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  dueDate: { type: Date },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'completed', 'cancelled'], 
    default: 'open' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  reminder: { type: Date }
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);
