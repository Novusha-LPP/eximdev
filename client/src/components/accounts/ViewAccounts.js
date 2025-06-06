import React, { useState } from "react";
import { TextField } from "@mui/material";
import { accountsMaster } from "../../assets/data/accountsMaster";
import { MenuItem } from "@mui/material";
import ViewAdani from "./view/ViewAdani";
import ViewAmc from "./view/ViewAmc";
import ViewFd from "./view/ViewFd";
import ViewElectricity from "./view/ViewElectricity";
import ViewLic from "./view/ViewLic";
import ViewMobile from "./view/ViewMobile";
import ViewRent from "./view/ViewRent";
import ViewCreditCard from "./view/ViewCreditCard";

function ViewAccounts() {
  const [masterType, setMasterType] = useState("Adani Gas");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  const masterComponent = () => {
    switch (masterType) {
      case "Rent":
        return <ViewRent />;
      case "Electricity":
        return <ViewElectricity />;
      case "Mobile/ Internet Connection":
        return <ViewMobile />;
      case "Adani Gas":
        return <ViewAdani />;
      case "Credit Card":
        return <ViewCreditCard />;
      case "LIC":
        return <ViewLic />;
      case "AMC":
        return <ViewAmc />;
      case "FD/ Investment":
        return <ViewFd />;
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
        {accountsMaster?.map((masterType) => {
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

export default React.memo(ViewAccounts);
