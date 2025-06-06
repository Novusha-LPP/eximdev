import React, { useState } from "react";
import { TextField } from "@mui/material";
import { accountsMaster } from "../../assets/data/accountsMaster";
import { MenuItem } from "@mui/material";
import Rent from "../../forms/accounts/Rent";
import Electricity from "../../forms/accounts/Electricity";
import Mobile from "../../forms/accounts/Mobile";
import Adani from "../../forms/accounts/Adani";
import CreditCard from "../../forms/accounts/CreditCard";
import AMC from "../../forms/accounts/AMC";
import LIC from "../../forms/accounts/LIC";
import FD from "../../forms/accounts/FD";

function Master() {
  const [masterType, setMasterType] = useState("Adani Gas");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  const masterComponent = () => {
    switch (masterType) {
      case "Rent":
        return <Rent />;
      case "Electricity":
        return <Electricity />;
      case "Mobile/ Internet Connection":
        return <Mobile />;
      case "Adani Gas":
        return <Adani />;
      case "Credit Card":
        return <CreditCard />;
      case "LIC":
        return <LIC />;
      case "AMC":
        return <AMC />;
      case "FD/ Investment":
        return <FD />;
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

export default React.memo(Master);
