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
    { name: "name", label: "Name", type: "text" },
    { name: "symbol", label: "Symbol", type: "text" },
    {
      name: "unit_type",
      label: "Unit Type",
      type: "select",
      options: [
        "number",
        "weight",
        "distance",
        "volume",
        "area",
        "time",
        "pressure",
        "power",
        "temperature",
      ],
    },
    { name: "decimal_places", label: "No. of Decimal Places", type: "number" },
  ],

  "Container Type": [
    { name: "container_type", label: "Container Type", type: "text" },
    { name: "iso_code", label: "ISO Code", type: "text" },
    { name: "teu", label: "TEU", type: "number", min: 1 },
    { name: "outer_dimension", label: "Outer Dimension", type: "text" },
    { name: "tare_weight", label: "Tare Weight", type: "number", min: 0 },
    { name: "payload", label: "Payload", type: "number", min: 0 },
  ],
};
