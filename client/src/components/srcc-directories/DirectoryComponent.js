import React from "react";
import { Box } from "@mui/material";
import UnitMeasurementDirectory from "./UnitMeasurementDirectory";
import ContainerTypeDirectory from "./ContainerTypeDirectory";
import LocationDirectory from "./LocationDirectory";
import StateDistrictDirectory from "./StateDistrictDirectory";
import PortsCfsYardDirectory from "./PortsCfsYardDirectory";
import Commodity from "./Commodity";
import VehicleTypes from "./VehicleTypes";
import Drivers from "./DriversListDirectory";

function DirectoryComponent({ directoryType }) {
  console.log("Selected Directory Type:", directoryType); // Debugging log

  const renderDirectory = () => {
    switch (directoryType) {
      case "Unit Measurement":
        return <UnitMeasurementDirectory />;
      case "Container Type": // ✅ Fix case to match viewMasterList
        return <ContainerTypeDirectory />;
      case "Location": // ✅ Added Location Directory
        return <LocationDirectory />;
      case "State District": // ✅ Added State District Directory
        return <StateDistrictDirectory />;
      case "Ports/CFS/Yard Directory": // ✅ Added State District Directory
        return <PortsCfsYardDirectory />;
      case "Commodity": // ✅ Added Commoditys Directory
        return <Commodity />;
      case "Vehicle Types": // ✅ Added Commoditys Directory
        return <VehicleTypes />;
      case "Drivers": // ✅ Added Commoditys Directory
        return <Drivers />;
      default:
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
