import mongoose from 'mongoose';

const punchSchema = new mongoose.Schema({
  employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },

  punch_type: {
    type: String,
    enum: ['IN', 'OUT', 'BREAK_START', 'BREAK_END'],
    required: true
  },
  punch_time: { type: Date, required: true, default: Date.now, index: true },
  punch_date: { type: Date, required: true, index: true }, // Date object for YYYY-MM-DD

  punch_method: {
    type: String,
    enum: ['web', 'mobile', 'biometric', 'manual', 'auto'],
    default: 'web'
  },

  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },

  ip_address: String,

  device_info: {
    device_id: String,
    device_type: String,
    browser: String,
    os: String
  },

  photo_url: String, // if face recognition enabled
  biometric_id: String, // if biometric punch

  is_valid: { type: Boolean, default: true },
  validation_errors: [String],

  is_regularized: { type: Boolean, default: false },
  regularization_id: { type: mongoose.Schema.Types.ObjectId, ref: 'RegularizationRequest' }
}, { timestamps: true });

// Add indices for performance
punchSchema.index({ employee_id: 1, punch_date: 1 });
punchSchema.index({ company_id: 1, punch_date: 1 });

// SECURITY PRINCIPLE: RAW DATA IMMUTABILITY 
// Punches are raw machine/web events. They must NEVER be modified or deleted.
punchSchema.pre('save', function(next) {
  if (!this.isNew) {
    throw new Error('SECURITY EXCEPTION: Attendance Punches are immutable raw data and cannot be modified after creation.');
  }
  if (typeof next === 'function') next();
});

const immutableErrorHandler = function() {
  throw new Error('SECURITY EXCEPTION: Attendance Punches are immutable raw data and cannot be updated or deleted.');
};

punchSchema.pre('updateOne', immutableErrorHandler);
punchSchema.pre('updateMany', immutableErrorHandler);
punchSchema.pre('findOneAndUpdate', immutableErrorHandler);
punchSchema.pre('deleteOne', immutableErrorHandler);
punchSchema.pre('deleteMany', immutableErrorHandler);
punchSchema.pre('findOneAndDelete', immutableErrorHandler);

export default mongoose.model('AttendancePunch', punchSchema);