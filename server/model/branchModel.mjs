import mongoose from "mongoose";

const portSchema = new mongoose.Schema({
    port_name: { type: String, required: true, trim: true },
    port_code: { type: String, required: true, trim: true, uppercase: true }
});

const branchSchema = new mongoose.Schema({
    branch_name: {
        type: String,
        required: true,
        trim: true
    },
    branch_code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 3,
        maxlength: 5
    },
    category: {
        type: String,
        enum: ['SEA', 'AIR'],
        required: true,
        default: 'SEA'
    },
    is_active: {
        type: Boolean,
        default: true
    },
    ports: [portSchema],
    created_at: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: String,
        trim: true
    },
    configuration: {
        railout_enabled: { type: Boolean, default: true },
        gateway_igm_enabled: { type: Boolean, default: true },
        gateway_igm_date_enabled: { type: Boolean, default: true }
    }
});

// Add a compound unique index for branch_code and category
branchSchema.index({ branch_code: 1, category: 1 }, { unique: true });

// Rules: branch_code must never be modified after creation
branchSchema.pre('validate', function (next) {
    if (!this.isNew && this.isModified('branch_code')) {
        next(new Error('branch_code cannot be modified after creation'));
    } else {
        next();
    }
});

const BranchModel = mongoose.model("Branch", branchSchema);
export default BranchModel;
