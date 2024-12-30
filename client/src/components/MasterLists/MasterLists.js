// src/components/MasterLists.js

export const customHouseOptions = [
  "ICD SANAND",
  "ICD KHODIYAR",
  "ICD SACHANA",
  "ICD AHMEDABAD",
  "ICD MUNDRA",
  "ICD PIPAVAV",
  "ICD KANDLA",
  ...Array.from({ length: 50 }, (_, i) => `Custom House ${i + 1}`),
];

export const importerOptions = [
  "Alpha Corp",
  "Beta Traders",
  "Gamma Imports",
  "Delta Exports",
  "Arfin Exim",
  "Zeta Solutions",
  "Omega Inc",
  "Arfinlike Enterprises",
  "Alpha Importers",
  "Zebra Global",
  ...Array.from({ length: 90 }, (_, i) => `Importer ${i + 1}`),
];

export const shippingLineOptions = [
  ...new Set([
    "MAXICON SHIPPING AGENCIES (DIV. OF SLAPL)",
    "Maersk Line",
    "CMA CGM AGENCIES INDIA PVT. LTD.",
    "SEABRIDGE MARINE AGENCIES PVT. LTD",
    "Hapag-Lloyd",
    "TRANS ASIA",
    "ZIM LINE",
    "Trans Asia",
  ]),
];

export const cth_Dropdown = [
    // {
    //   document_name: "Commercial Invoice",
    //   document_code: "380000",
    // },
    // {
    //   document_name: "Packing List",
    //   document_code: "271000",
    // },
    // {
    //   document_name: "Bill of Lading",
    //   document_code: "704000",
    // },
    {
      document_name: "Certificate of Origin",
      document_code: "861000",
    },
    {
      document_name: "Contract",
      document_code: "315000",
    },
    {
      document_name: "Insurance",
      document_code: "91WH13",
    },
    {
      document_name: "Pre-Shipment Inspection Certificate",
      document_code: "856001",
    },
    { document_name: "Form 9 & Form 6", document_code: "0856001" },
    {
      document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
      document_code: "101000",
    },
    { document_name: "Certificate of Analysis", document_code: "001000" },
  ];
