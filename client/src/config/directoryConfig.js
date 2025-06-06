export const directoryConfig = {
  Vehicles: {
    fields: [
      { name: "vehicleNo", label: "Vehicle Number", type: "text" },
      { name: "type", label: "Vehicle Type", type: "text" },
      { name: "maxTyres", label: "Max Tyres", type: "number" },
      { name: "manufacturer", label: "Manufacturer", type: "text" },
    ],
    dummyData: [
      {
        id: 1,
        vehicleNo: "MH-01-AB-1234",
        type: "Truck",
        maxTyres: 6,
        manufacturer: "Tata",
      },
      {
        id: 2,
        vehicleNo: "MH-02-CD-5678",
        type: "Container",
        maxTyres: 10,
        manufacturer: "Volvo",
      },
    ],
  },
  Vendors: {
    fields: [
      { name: "name", label: "Vendor Name", type: "text" },
      { name: "contact", label: "Contact Number", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "gst", label: "GST Number", type: "text" },
    ],
    dummyData: [
      {
        id: 1,
        name: "ABC Suppliers",
        contact: "9876543210",
        address: "Mumbai",
        gst: "GST123456",
      },
      {
        id: 2,
        name: "XYZ Trading",
        contact: "9876543211",
        address: "Delhi",
        gst: "GST789012",
      },
    ],
  },
  // Add more directory configurations as needed
};
