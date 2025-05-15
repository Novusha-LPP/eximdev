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
import VehicleRegistration from "./VehicleRegistration";
import TollData from "./TollData";
import AdvanceToDriver from "./AdvanceToDriver";
import ShippingLine from "./ShippingLine";
import Elock from "./Elock";
import Organisation from "./Organisation";
import UnitConversion from "./unitConversion";
import CountryCode from "./ContryCode";
import CurrencyDirectory from "./CurrencyDirectory";
import PortDirectory from "./PortDirectory";

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
      case "Vehicle Registration": // ✅ Added Commoditys Directory
        return <VehicleRegistration />;
      case "Toll Data": // ✅ Added Commoditys Directory
        return <TollData />;
      case "Advance To Driver": // ✅ Added Commoditys Directory
        return <AdvanceToDriver />;
      case "shipping Line": // ✅ Added Commoditys Directory
        return <ShippingLine />;
      case "Elock": // ✅ Added Commoditys Directory
        return <Elock />;
      case "Organisation": // ✅ Added Commoditys Directory
        return <Organisation />;
      case "Unit Conversion": // ✅ Added Commoditys Directory
        return <UnitConversion />;
      case "Country Code": // ✅ Added Commoditys Directory
        return <CountryCode />;
      case "Currency": // ✅ Added Commoditys Directory
        return <CurrencyDirectory />;
      case "Port": // ✅ Added Commoditys Directory
        return <PortDirectory/>;
      default:
        console.log("No matching directory found for:", directoryType);
        return null;
    }
  };

  return <Box sx={{ width: "100%", mt: 2 }}>{renderDirectory()}</Box>;
}

export default DirectoryComponent;
