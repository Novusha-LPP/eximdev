import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Divider } from "@mui/material";
import ProductMainTab from "./ProductMainTab";
import ProductGeneralTab from "./ProductGeneralTab";
import DrawbackTab from "./DrawbackTab";
// TODO: import additional subtabs if needed later

function ProductTabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const ProductTab = ({ formik, directories, params }) => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Product & Item Details
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Tabs
        value={activeSubTab}
        onChange={(e, v) => setActiveSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          "& .MuiTab-root": {
            minWidth: 80,
            fontSize: "0.85rem",
            fontWeight: 500,
            textTransform: "none",
          },
        }}
      >
        <Tab label="Main" />
        <Tab label="General" />
        <Tab label="Drawback" />
        {/* Add subtabs here if product module expands later */}
      </Tabs>
      <ProductTabPanel value={activeSubTab} index={0}>
        <ProductMainTab
          formik={formik}
          directories={directories}
          params={params}
        />
      </ProductTabPanel>
      <ProductTabPanel value={activeSubTab} index={1}>
        <ProductGeneralTab formik={formik} />
      </ProductTabPanel>
      <ProductTabPanel value={activeSubTab} index={2}>
        <DrawbackTab formik={formik} />
      </ProductTabPanel>
    </Box>
  );
};
export default ProductTab;
