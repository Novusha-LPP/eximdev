import mongoose from "mongoose";
import ITUnifiedAsset from "../model/it-helpdesk/unifiedAssetModel.mjs";

async function run() {
  await mongoose.connect("mongodb://localhost:27017/eximNew");

  const categoriesToTest = [
    {
      name: "Computer / Desktop (Section 2)",
      doc: {
        asset_tag: "CHK-PC-001",
        category: "Computer / Desktop",
        brand: "Dell",
        model: "OptiPlex 7090",
        serial_number: "CHK-PC-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        department: "Accounts",
        location: "1st Floor",
        specs: {
          processor: "Intel Core i5-11500",
          ram: "16 GB",
          storage_type: "SSD",
          storage_capacity: "512 GB",
          operating_system: "Windows 11 Pro",
          hostname: "ACC-PC-01",
          mac_address: "XX-XX-XX-XX-XX-XX",
        },
      },
    },
    {
      name: "Laptop (Section 3)",
      doc: {
        asset_tag: "CHK-LAP-001",
        category: "Laptop",
        brand: "Dell",
        model: "Latitude 5400",
        serial_number: "CHK-LAP-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        department: "Accounts",
        location: "1st Floor",
        specs: {
          processor: "Intel Core i5-8365U",
          ram: "16 GB",
          storage_type: "NVMe SSD",
          storage_capacity: "512 GB",
          operating_system: "Windows 11 Pro",
          hostname: "LAP-RAHUL",
          mac_address: "XX-XX-XX-XX-XX-XX",
        },
      },
    },
    {
      name: "Monitor (Section 4)",
      doc: {
        asset_tag: "CHK-MON-001",
        category: "Monitor",
        brand: "Dell",
        model: "P2422H",
        serial_number: "CHK-MON-SN",
        inventory_type: "New Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        department: "Accounts",
        location: "1st Floor",
        specs: {
          screen_size: "24 Inch",
          resolution: "1920 × 1080",
          warranty_duration: "3 Years",
        },
      },
    },
    {
      name: "Printer (Section 5)",
      doc: {
        asset_tag: "CHK-PRN-001",
        category: "Printer",
        brand: "HP",
        model: "LaserJet Pro MFP M428fdw",
        serial_number: "CHK-PRN-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "Available",
        condition: "Good",
        specs: {
          printer_type: "Multifunction (MFP)",
          color_mono: "Monochrome",
          print_technology: "Laser",
          connectivity: "Network & USB",
          ip_address: "192.168.1.150",
          mac_address: "XX-XX-XX-XX-XX-XX",
          print_count: "15420",
        },
      },
    },
    {
      name: "Server (Section 6)",
      doc: {
        asset_tag: "CHK-SRV-001",
        category: "Server",
        brand: "Dell PowerEdge",
        model: "PowerEdge R750",
        serial_number: "CHK-SRV-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        specs: {
          processor: "Intel Xeon Silver 4314",
          cpu_cores: "16 Cores",
          ram: "64 GB ECC",
          storage_type: "SAS SSD",
          total_storage: "4 TB",
          raid_config: "RAID 5",
          operating_system: "Windows Server 2022",
          hostname: "PROD-SRV-01",
          server_role: "Database",
          ip_address: "192.168.1.10",
          mac_address: "XX-XX-XX-XX-XX-XX",
        },
      },
    },
    {
      name: "Network Device (Section 7)",
      doc: {
        asset_tag: "CHK-NET-001",
        category: "Network Device",
        brand: "Cisco",
        model: "Catalyst 2960-X",
        serial_number: "CHK-NET-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        specs: {
          device_type: "Switch",
          firmware_version: "v15.2(4)E",
          port_count: "24-Port",
          management_ip: "192.168.1.1",
          poe_support: "Yes (PoE+ 802.3at)",
          poe_budget: "370W",
          uplink_port: "4x 10G SFP+",
          rack_cabinet: "Rack 2 - U14",
          mac_address: "XX-XX-XX-XX-XX-XX",
        },
      },
    },
    {
      name: "Mobile Device (Section 8)",
      doc: {
        asset_tag: "CHK-MOB-001",
        category: "Mobile Device",
        brand: "Samsung",
        model: "Galaxy A54",
        serial_number: "CHK-MOB-SN",
        inventory_type: "New Inventory",
        lifecycle_status: "Available",
        condition: "Good",
        specs: {
          imei_number: "863456041234567",
          imei_2: "863456041234568",
          sim_number: "+91 9876543210",
          ram: "8 GB",
          storage_capacity: "128 GB",
          operating_system: "Android 14",
        },
      },
    },
    {
      name: "Software License (Section 9)",
      doc: {
        asset_tag: "CHK-LIC-001",
        category: "Software License",
        brand: "Microsoft",
        model: "Standard",
        serial_number: "N/A",
        inventory_type: "New Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        specs: {
          software_name: "Microsoft 365 Business Standard",
          version: "2024",
          license_type: "Subscription",
          license_key: "XXXX-XXXX-XXXX-XXXX",
          seat_count: "25",
        },
      },
    },
    {
      name: "Other (Section 10)",
      doc: {
        asset_tag: "CHK-OTH-001",
        category: "Other",
        brand: "APC",
        model: "Smart-UPS 1500VA",
        serial_number: "CHK-OTH-SN",
        inventory_type: "Old Inventory",
        lifecycle_status: "In Use",
        condition: "Good",
        specs: {
          custom_notes: "1500VA Line-Interactive UPS with LCD interface",
        },
      },
    },
  ];

  for (const item of categoriesToTest) {
    const doc = new ITUnifiedAsset(item.doc);
    await doc.validate();
    console.log(`PASS: ${item.name}`);
  }

  await mongoose.disconnect();
  console.log("ALL 9 CATEGORIES VALIDATED WITH ZERO ERRORS!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
