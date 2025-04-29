import mongoose from "mongoose";
import Elock from "./Directory_Management/Elock.mjs";

const PrDataSchema = new mongoose.Schema({
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
    type: String,
  },
  consignee: {
    type: String,
  },
  container_type: {
    type: String,
  },
  container_count: {
    type: String,
  },
  gross_weight: {
    type: String,
  },
  type_of_vehicle: {
    type: String,
  },
  no_of_vehicle: {
    type: String,
  },
  description: {
    type: String,
  },
  shipping_line: {
    type: String,
  },
  container_loading: {
    type: String,
  },
  container_offloading: {
    type: String,
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
    type: String,
  },
  goods_delivery: {
    type: String,
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
        type: String,
      },
      goods_delivery: {
        type: String,
      },
      own_hired: {
        type: String,
      },
      type_of_vehicle: {
        type: String,
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
      elock: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Elock", // Reference the Elock model
      },
      status: {
        type: String,
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
});

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
  this.populate("containers.elock");
});

PrDataSchema.pre("findOne", function () {
  this.populate("containers.elock");
});

const PrData = new mongoose.model("PrData", PrDataSchema);
export default PrData;
