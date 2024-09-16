import mongoose from "mongoose";

// Define the SrcelSchema schema
const SrcelSchema = new mongoose.Schema({
  FGUID: {
    type: String,
    required: true,
  },
  FAssetID: {
    type: String,
    required: true,
  },
  FAssetTypeID: {
    type: Number,
    required: true,
  },
  FDescription: {
    type: String,
    default: "",
  },
  FSIMNumber: {
    type: String,
    default: "",
  },
  FAgentGUID: {
    type: String,
    required: true,
  },
  FAgentName: {
    type: String,
    required: true,
  },
  FGroupGUID: {
    type: String,
    default: null,
  },
  FGroupName: {
    type: String,
    default: "",
  },
  FCreateTime: {
    type: Date,
    required: true,
  },
  FExpireTime: {
    type: Date,
    required: true,
  },
  FFactorySimNo: {
    type: String,
    default: null,
  },
  FVehicleName: {
    type: String,
    required: true,
  },
  sr_cel_no: {
    type: String,
    required: false,
  },
  sr_cel_locked: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const SrcelModel = mongoose.model("Srcel", SrcelSchema);
export default SrcelModel;
