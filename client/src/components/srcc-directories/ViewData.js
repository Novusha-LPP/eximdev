import React, { useState } from "react";
import { TextField } from "@mui/material";
import { viewMasterList } from "../../assets/data/srccDirectoriesData";
import { MenuItem } from "@mui/material";
import Vendors from "./view-data/Vendors";
import Vehicles from "./view-data/Vehicles";
import TyreTypes from "./view-data/TyreTypes";
import TyreSizes from "./view-data/TyreSizes";
import TyreModels from "./view-data/TyreModels";
import TyreBrands from "./view-data/TyreBrands";
import RepairTypes from "./view-data/RepairTypes";
import PlyRatings from "./view-data/PlyRatings";
import DriverDetails from "./view-data/DriverDetails";
import TypeOfVehicle from "./view-data/TypeOfVehicles";
import ContainerType from "./view-data/ContainerTypes";
import LocationMaster from "./view-data/Locations";
import Organisations from "./view-data/Organisations";

function ViewData() {
  const [masterType, setMasterType] = useState("Vendors");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  const masterComponent = () => {
    switch (masterType) {
      case "Vendors":
        return <Vendors />;
      case "Vehicles":
        return <Vehicles />;
      case "Tyre types":
        return <TyreTypes />;
      case "Tyre sizes":
        return <TyreSizes />;
      case "Tyre models":
        return <TyreModels />;
      case "Tyre brands":
        return <TyreBrands />;
      case "Repair types":
        return <RepairTypes />;
      case "Ply ratings":
        return <PlyRatings />;
      case "Driver details":
        return <DriverDetails />;
      case "Type of vehicle":
        return <TypeOfVehicle />;
      case "Container type":
        return <ContainerType />;
      case "Locations":
        return <LocationMaster />;
      case "Organisations":
        return <Organisations />;
      default:
        return null;
    }
  };

  return (
    <div>
      <TextField
        select
        size="small"
        margin="normal"
        variant="outlined"
        label="Select Master"
        value={masterType}
        onChange={handleMasterChange}
        sx={{ width: "300px" }}
      >
        {viewMasterList.map((masterType) => {
          return (
            <MenuItem key={masterType} value={masterType}>
              {masterType}
            </MenuItem>
          );
        })}
      </TextField>

      {masterComponent()}
    </div>
  );
}

export default ViewData;
