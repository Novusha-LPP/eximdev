import React from "react";

const usePrJobColumns = () => {
  const columns = [
    {
      accessorKey: "jobNo",
      header: "Job No",
      size: 100,
      enableColumnFilter: false,
    },
    {
      accessorKey: "importer",
      header: "Importer",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 100,
      enableColumnFilter: true,
    },
  ];
  return columns;
};

export default usePrJobColumns;
