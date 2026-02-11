
import mongoose from 'mongoose';

const mrmMetadataSchema = new mongoose.Schema({
    month: { type: String, required: true },
    year: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    meetingDate: { type: Date },
    reviewDate: { type: Date },
    meetingDone: { type: Boolean, default: false },
}, { timestamps: true });

// Ensure one entry per user-month-year
mrmMetadataSchema.index({ month: 1, year: 1, userId: 1 }, { unique: true });

const MRMMetadata = mongoose.model('MRMMetadata', mrmMetadataSchema);

// Attempt to drop the old unique index that conflicts with user-specific data
const dropOldIndex = async () => {
    try {
        if (mongoose.connection.readyState !== 1) { // 1 = connected
            await new Promise(resolve => mongoose.connection.once('connected', resolve));
        }
        await MRMMetadata.collection.dropIndex('month_1_year_1');
        console.log("Dropped old unique index: month_1_year_1");
    } catch (err) {
        // Ignore error if index doesn't exist (code 27)
        if (err.code !== 27 && err.message?.indexOf('ns not found') === -1) {
            console.log("Note: Could not drop index month_1_year_1:", err.message);
        }
    }
};

// Execute independently so it doesn't block export
dropOldIndex();

export default MRMMetadata;
