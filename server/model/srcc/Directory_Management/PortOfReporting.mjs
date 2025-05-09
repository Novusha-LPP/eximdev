import mongoose from "mongoose";

const PortSchema = new mongoose.Schema(
    {
      port_name: { type: String },
      port_address: { type: String },
      port_code: { type: String },
      custom_fields: {
        type: Map,
        of: mongoose.Schema.Types.Mixed, // accept any primitive type
        default: {}
      },
    },
    { timestamps: true }
  );
  

export default mongoose.model("port", PortSchema);
