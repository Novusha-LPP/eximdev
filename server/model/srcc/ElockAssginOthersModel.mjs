import mongoose from "mongoose";

const ElockAssignOthersSchema = new mongoose.Schema(
  {
    transporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
    },
    lr_no: {
      type: String,
      index: true, // Add index if you frequently query by lr_no
    },
    container_number: {
      type: String,
    },
    vehicle_no: {
      type: String,
      index: true, // Add index if you frequently query by vehicle_no
    },
    driver_name: {
      type: String,
    },
    driver_phone: {
      type: String,
    },
    elock_no: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Elock",
      index: true, // Add index if you frequently query by elock_no
    },
    elock_assign_status: {
      type: String,
      enum: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"],
      default: "UNASSIGNED",
    },
    goods_pickup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    goods_delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ElockAssignOthers", ElockAssignOthersSchema);
