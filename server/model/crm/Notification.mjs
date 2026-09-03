import mongoose from 'mongoose';

const crmNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String }
}, { timestamps: true });

export default mongoose.model('CRMNotification', crmNotificationSchema);
