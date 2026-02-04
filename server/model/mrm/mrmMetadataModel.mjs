
import mongoose from 'mongoose';

const mrmMetadataSchema = new mongoose.Schema({
    month: { type: String, required: true },
    year: { type: Number, required: true },
    meetingDate: { type: Date },
    reviewDate: { type: Date },
}, { timestamps: true });

// Ensure one entry per month-year
mrmMetadataSchema.index({ month: 1, year: 1 }, { unique: true });

const MRMMetadata = mongoose.model('MRMMetadata', mrmMetadataSchema);
export default MRMMetadata;
