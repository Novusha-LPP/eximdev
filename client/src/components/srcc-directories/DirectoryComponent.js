import React from "react";
import { Box } from "@mui/material";
import UnitMeasurementDirectory from "./UnitMeasurementDirectory";
import VehicleDirectory from "./VehiclesDirectory";

function DirectoryComponent({ directoryType }) {
  console.log("Selected Directory Type:", directoryType); // Add this for debugging

  const renderDirectory = () => {
    switch (directoryType) {
      case "Unit Measurement":
        return <UnitMeasurementDirectory />;
      case "Vehicle":
        return <VehicleDirectory />;
      default:
        // Add this for debugging
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
