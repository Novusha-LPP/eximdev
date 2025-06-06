import React, { useState } from "react";
import { TextField } from "@mui/material";
import { formMasterList } from "../../assets/data/srccDirectoriesData";
import { MenuItem } from "@mui/material";
import Vendors from "./forms/Vendors";
import Vehicles from "./forms/Vehicles";
import TyreTypes from "./forms/TyreTypes";
import TyreSizes from "./forms/TyreSizes";
import TyreModels from "./forms/TyreModels";
import TyreBrands from "./forms/TyreBrands";
import RepairTypes from "./forms/RepairTypes";
import PlyRatings from "./forms/PlyRatings";
import DriverDetails from "./forms/DriverDetails";
import TypeOfVehicle from "./forms/TypeOfVehicle";
import ContainerType from "./forms/ContainerType";
import LocationMaster from "./forms/LocationMaster";
import OrganisationMaster from "./forms/OrganisationMaster";

function FormMaster() {
  const [masterType, setMasterType] = useState("Add a vendor");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  const masterComponent = () => {
    switch (masterType) {
      case "Add a vendor":
        return <Vendors />;
      case "Add a vehicle":
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
      case "Location master":
        return <LocationMaster />;
      case "Organisation master":
        return <OrganisationMaster />;
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
        {formMasterList.map((masterType) => {
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

export default FormMaster;
