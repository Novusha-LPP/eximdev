import mongoose from "mongoose";

const typeOfVehicleSchema = new mongoose.Schema({
  type_of_vehicle: {
    type: String,
    trim: true,
  },
});

export default mongoose.model("TypeOfVehicle", typeOfVehicleSchema);
