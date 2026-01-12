// models/releaseNoteModel.js
import mongoose from 'mongoose';
import { createDynamicModel } from "../utils/modelHelper.mjs";

const releaseNoteSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  releaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  changes: [{
    category: {
      type: String,
      enum: ['feature', 'improvement', 'bugfix', 'breaking', 'security', 'performance', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    impact: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

releaseNoteSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const ReleaseNoteModel = createDynamicModel('ReleaseNote', releaseNoteSchema, "AHMEDABAD HO");
export default ReleaseNoteModel;
