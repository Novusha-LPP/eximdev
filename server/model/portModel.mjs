import mongoose from "mongoose";

const portSchema = new mongoose.Schema({
    port_name: {
        type: String,
        required: true,
        trim: true
    },
    port_code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    mode: {
        type: String,
        enum: ['SEA', 'AIR'],
        required: true,
        default: 'SEA'
    },
    is_active: {
        type: Boolean,
        default: true
    },
    country: {
        type: String,
        trim: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const PortModel = mongoose.model("Port", portSchema, "portsimp");
export default PortModel;
