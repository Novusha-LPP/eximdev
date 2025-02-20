import React from "react";
import { Box } from "@mui/material";
import UnitMeasurementDirectory from "./UnitMeasurementDirectory";
import ContainerTypeDirectory from "./ContainerTypeDirectory";
import LocationDirectory from "./LocationDirectory";
import StateDistrictDirectory from "./StateDistrictDirectory";

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
      default:
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
