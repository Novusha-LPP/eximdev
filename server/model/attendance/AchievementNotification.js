import mongoose from 'mongoose';

const achievementNotificationSchema = new mongoose.Schema({
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    employee_name: {
        type: String,
        required: true,
    },
    employee_username: {
        type: String,
    },
    employee_photo: {
        type: String,
    },
    company: {
        type: String,
    },
    company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
    },
    achievement_tag: {
        type: String,
        required: true,
        trim: true
    },
    assigned_by: {
        type: String,
    },
    read_by: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, { timestamps: true });

achievementNotificationSchema.index({ createdAt: -1 });

export default mongoose.model('AchievementNotification', achievementNotificationSchema);
