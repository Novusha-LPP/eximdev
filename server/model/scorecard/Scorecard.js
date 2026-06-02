import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema({
  date: { type: Date },
  issue: { type: String, trim: true },
  responseTime: { type: String, trim: true },
  resolutionTime: { type: String, trim: true },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved"],
    default: "Open",
  },
  remarks: { type: String, trim: true },
});

const EvaluationItemSchema = new mongoose.Schema({
  srNo: { type: Number, required: true },
  criteria: { type: String, required: true },
  weightage: { type: Number, required: true },
  rating: { type: Number, min: 0, max: 10, default: 0 },
  score: { type: Number, default: 0 },
});

const ScorecardSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, trim: true },
    serviceType: { type: String, trim: true },
    evaluationPeriod: { type: String }, // e.g. "2024-06"
    evaluatedBy: { type: String, trim: true },
    branch: {
      type: String,
      enum: ["All Branches", "SEA", "AIR", "HQ"],
      default: "All Branches",
    },
    date: { type: Date, default: Date.now },
    evaluationItems: [EvaluationItemSchema],
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 10 },
    percentage: { type: Number, default: 0 },
    overallRating: {
      type: String,
      enum: ["Excellent", "Good", "Satisfactory", "Needs Improvement", "Poor", ""],
      default: "",
    },
    complaints: [ComplaintSchema],
    overallRemarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

// Auto-compute scores before save
ScorecardSchema.pre("save", function (next) {
  let total = 0;
  let maxTotal = 0;

  this.evaluationItems.forEach((item) => {
    item.score = parseFloat(((item.rating * item.weightage) / 10).toFixed(2));
    total += item.score;
    maxTotal += item.weightage;
  });

  this.totalScore = parseFloat(total.toFixed(2));
  this.maxScore = maxTotal;
  this.percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  const pct = this.percentage;
  if (pct >= 90) this.overallRating = "Excellent";
  else if (pct >= 70) this.overallRating = "Good";
  else if (pct >= 60) this.overallRating = "Satisfactory";
  else if (pct >= 50) this.overallRating = "Needs Improvement";
  else this.overallRating = "Poor";

  next();
});

export default mongoose.model("Scorecard", ScorecardSchema);
