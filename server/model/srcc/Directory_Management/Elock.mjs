import mongoose from "mongoose";

const ElockSchema = new mongoose.Schema(
  {
    ElockNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\d+$/.test(v); // Only allows digits
        },
        message: (props) =>
          `${props.value} is not a valid number! Only numbers are allowed.`,
      },
    },
  },
  { timestamps: true }
);

const Elock = mongoose.model("Elock", ElockSchema);

export default Elock;
