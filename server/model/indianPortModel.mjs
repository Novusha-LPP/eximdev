import mongoose from "mongoose";

const indianPortSchema = new mongoose.Schema({
    port_code: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String
    },
    place: {
        type: String
    },
    pincode: {
        type: String
    }
}, { timestamps: true });

const IndianPortModel = mongoose.model("IndianPort", indianPortSchema);

export default IndianPortModel;
