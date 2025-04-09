import React from "react";

const usePrJobColumns = () => {
  const columns = [
    {
      accessorKey: "pr_no",
      header: "PR No",
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
    {
      accessorKey: "pr_date",
      header: "PR Date",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "import_export",
      header: "Import/Export",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_type",
      header: "Container Type",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_count",
      header: "Container Count",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "gross_weight",
      header: "Gross Weight",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "no_of_vehicle",
      header: "No. of Vehicles",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "description",
      header: "Description",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "shipping_line",
      header: "Shipping Line",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_loading",
      header: "Container Loading",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_offloading",
      header: "Container Offloading",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "do_validity",
      header: "DO Validity",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "instructions",
      header: "Instructions",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "document_no",
      header: "Document No",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "document_date",
      header: "Document Date",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "goods_pickup",
      header: "Goods Pickup",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      size: 150,
      enableColumnFilter: true,
    },
  ];
  return columns;
};

export default usePrJobColumns;
