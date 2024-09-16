import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import useTabs from "../../customHooks/useTabs";
import NewTyre from "./NewTyre";
import TyreFitting from "./TyreFitting";
import TyreBlast from "./TyreBlast";
import TyreRepairs from "./TyreRepairs";
import TyreRetreading from "./TyreRetreading";
import DriverAssignment from "./DriverAssignment";
import TyreDetails from "./TyreDetails";
import TruckDetails from "./TruckDetails";

function TyreMaintenance() {
  const [value, setValue] = React.useState(0);
  const { a11yProps, CustomTabPanel } = useTabs();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          [
          <Tab label="New Tyre" {...a11yProps(0)} key={0} />,
          <Tab label="Tyre Fitting" {...a11yProps(1)} key={1} />,
          <Tab label="Tyre Blast" {...a11yProps(2)} key={2} />,
          <Tab label="Tyre Repairs" {...a11yProps(3)} key={3} />,
          <Tab label="Tyre Retreading" {...a11yProps(4)} key={4} />,
          <Tab label="Driver Assignment" {...a11yProps(5)} key={5} />,
          <Tab label="Tyre Details" {...a11yProps(6)} key={6} />,
          <Tab label="Truck Details" {...a11yProps(7)} key={7} />, ]
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <NewTyre />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <TyreFitting />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <TyreBlast />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={3}>
        <TyreRepairs />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={4}>
        <TyreRetreading />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={5}>
        <DriverAssignment />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={6}>
        <TyreDetails />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={7}>
        <TruckDetails />
      </CustomTabPanel>
    </Box>
  );
}

export default React.memo(TyreMaintenance);
