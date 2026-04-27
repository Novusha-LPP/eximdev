import mongoose from "mongoose";

const customHouseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    is_active: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

const CustomHouseModel = mongoose.model("CustomHouse", customHouseSchema, "customhousesimp");
export default CustomHouseModel;
