import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    trim: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  }, // e.g., "Tally Integration"
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }, // ID of the admin who created it
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsedAt: { 
    type: Date 
  },
});

const ApiKeyModel = mongoose.model("ApiKey", apiKeySchema);
export default ApiKeyModel;
