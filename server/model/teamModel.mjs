import mongoose from "mongoose";

const Schema = mongoose.Schema;

const teamSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    department: {
        type: String,
        trim: true,
    },
    hodId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    hodUsername: {
        type: String,
        required: true,
    },
    members: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            username: {
                type: String,
            },
            addedAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field on each save
teamSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const TeamModel = mongoose.model("Team", teamSchema);
export default TeamModel;
