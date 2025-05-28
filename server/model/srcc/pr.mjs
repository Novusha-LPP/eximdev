import mongoose from "mongoose";
import ContainerType from "./containerType.mjs";
import Organisation from "./Directory_Management/Organisation.mjs";
import Location from "./Directory_Management/location.mjs";
import ShippingLine from "./Directory_Management/ShippingLine.mjs";
import VehicleType from "./Directory_Management/VehicleType.mjs";
import LrTrackingStages from "./Directory_Management/LrTrackingStages.mjs";

const TrackingHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const PrDataSchema = new mongoose.Schema(
  {
    pr_no: {
      type: String,
    },
    pr_date: {
      type: String,
    },
    import_export: {
      type: String,
    },
    branch: {
      type: String,
    },
    consignor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    consignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    container_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContainerType",
    },
    container_count: {
      type: String,
    },
    gross_weight: {
      type: String,
    },
    type_of_vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType",
    },
    no_of_vehicle: {
      type: String,
    },
    description: {
      type: String,
    },
    shipping_line: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingLine",
    },
    container_loading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    container_offloading: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    do_validity: {
      type: String,
    },
    instructions: {
      type: String,
    },
    document_no: {
      type: String,
    },
    document_date: {
      type: String,
    },
    goods_pickup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    goods_delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    suffix: { type: String, required: false },
    prefix: { type: String, required: false },
    containers: [
      {
        tr_no: {
          type: String,
        },
        container_number: {
          type: String,
        },
        seal_no: {
          type: String,
        },
        gross_weight: {
          type: String,
        },
        tare_weight: {
          type: String,
        },
        net_weight: {
          type: String,
        },
        goods_pickup: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
        },
        goods_delivery: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Location",
        },
        own_hired: {
          type: String,
        },
        type_of_vehicle: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "VehicleType",
        },
        vehicle_no: {
          type: String,
        },
        driver_name: {
          type: String,
        },
        driver_phone: {
          type: String,
        },
        eWay_bill: {
          type: String,
        },
        isOccupied: {
          type: Boolean,
        },
        sr_cel_no: {
          type: String,
        },
        sr_cel_FGUID: {
          type: String,
        },
        sr_cel_id: {
          type: String,
        },
        elock_no: {
          type: String,
        },        tracking_status: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LrTrackingStages",
        },
        tracking_status_history: {
          type: [TrackingHistorySchema],
          default: [],
        },
        elock_assign_status: {
          type: String,
          enum: ["ASSIGNED", "UNASSIGNED", "RETURNED", "NOT RETURNED"],
          default: "UNASSIGNED",
        },
        lr_completed: {
          type: Boolean,
          default: false, // Default to false
        },
        offloading_date_time: {
          type: Date,
        },
        detention_days: {
          type: Number,
        },
        reason_of_detention: {
          type: String,
        },
        tipping: {
          type: Boolean,
        },
        document_attachment: [{ type: String, trim: true }],
      },
    ],
    status: {
      type: String,
    },
  },
  { timestamps: true }
);

// Add a virtual field to check if the job is completed
PrDataSchema.virtual("isJobCompleted").get(function () {
  return this.containers.every((container) => container.lr_completed === true);
});

PrDataSchema.index({ pr_no: 1 });
PrDataSchema.index({ "containers.lr_completed": 1 });
PrDataSchema.index({ "containers.tr_no": 1 });
PrDataSchema.index({ status: 1 });

// Enable population of the `elock` field
PrDataSchema.pre("find", function () {
  this.populate("containers.elock_no");
});

PrDataSchema.pre("findOne", function () {
  this.populate("containers.elock_no");
});

const PrData = new mongoose.model("PrData", PrDataSchema);
export default PrData;
