export const formMasterList = [
  "Add a vendor",
  "Add a vehicle",
  "Tyre types",
  "Tyre sizes",
  "Tyre brands",
  "Tyre models",
  "Repair types",
  "Ply ratings",
  "Driver details",
  "Type of vehicle",
  "Container type",
  "Location master",
  "Organisation master",
];

export const viewMasterList = [
  "Unit Measurement",
  "Vehicle",
  "Container Type",
  "Driver Details",
  "Location",
  "Organisation",
  "Ply Rating",
  "Repair Type",
  "Type of Vehicle",
  "Tyre Brand",
  "Tyre Model",
  "Tyre Size",
  "Tyre Type",
  "Vendor",
];

export const directoryFields = {
  "Unit Measurement": [
    { name: "description", label: "Description", type: "text" },
    { name: "code", label: "Code", type: "text" },
    {
      name: "unit_type",
      label: "Unit Type",
      type: "select",
      options: ["number", "weight", "distance", "volume", "area"],
    },
    { name: "decimal_places", label: "No. of Decimal Places", type: "number" },
  ],
};
