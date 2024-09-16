import mongoose from "mongoose";

const PrDataSchema = new mongoose.Schema({
  pr_no: {
    type: String,
  },
  pr_date: {
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
      sr_cel_no: {
        type: String,
      },
      sr_cel_FGUID: {
        type: String,
      },
      sr_cel_id: {
        type: String,
      },
      status: {
        type: String,
      },
    },
  ],
});

const PrData = new mongoose.model("PrData", PrDataSchema);
export default PrData;
