const usePrJobColumns = () => {
  const columns = [
    {
      accessorKey: "pr_no",
      header: "PR No",
      size: 170,
      enableColumnFilter: false,
    },

    {
      accessorKey: "consignee",
      header: "Consignee",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.consignee?.name || "-",
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
      Cell: ({ row }) => row.original.consignor?.name || "-",
    },
    {
      accessorKey: "container_type",
      header: "Container Type",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.container_type?.container_type || "-",
    },
    {
      accessorKey: "container_count",
      header: "Container Count",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.type_of_vehicle?.vehicleType || "-",
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
      Cell: ({ row }) => row.original.shipping_line?.name || "-",
    },
    {
      accessorKey: "container_loading",
      header: "Container Loading",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.container_loading?.name || "-",
    },
    {
      accessorKey: "container_offloading",
      header: "Container Offloading",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.container_offloading?.name || "-",
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
      Cell: ({ row }) => row.original.goods_pickup?.name || "-",
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.goods_delivery?.name || "-",
    },
  ];
  return columns;
};

export default usePrJobColumns;
