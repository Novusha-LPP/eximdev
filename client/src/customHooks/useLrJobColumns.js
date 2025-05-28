const usePrJobColumns = () => {
  const columns = [
    {
      accessorKey: "pr_no",
      header: "PR No",
      size: 170,
      enableColumnFilter: false,
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.consignor?.name || "-",
    },
    {
      accessorKey: "consignee",
      header: "Consignor",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) => row.original.consignee?.name || "-",
    },
    {
      accessorKey: "container_details.tr_no",
      header: "LR No",
      size: 170,
      enableColumnFilter: true,
      Cell: ({ cell }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "container_details.container_number",
      header: "Container Number",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ cell }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "container_details.seal_no",
      header: "Seal No",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.gross_weight",
      header: "Container Gross Weight",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.tare_weight",
      header: "Tare Weight",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.net_weight",
      header: "Net Weight",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.goods_pickup",
      header: "Container Goods Pickup",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) =>
        row.original.container_details.goods_pickup?.name || "-",
    },
    {
      accessorKey: "container_details.goods_delivery",
      header: "Container Goods Delivery",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) =>
        row.original.container_details.goods_delivery?.name || "-",
    },
    {
      accessorKey: "container_details.own_hired",
      header: "Own/Hired",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.type_of_vehicle",
      header: "Vehicle Type",
      size: 150,
      enableColumnFilter: true,
      Cell: ({ row }) =>
        row.original.container_details.type_of_vehicle?.vehicleType || "-",
    },
    {
      accessorKey: "container_details.vehicle_no",
      header: "Vehicle No",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.driver_name",
      header: "Driver Name",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.driver_phone",
      header: "Driver Phone",
      size: 150,
      enableColumnFilter: true,
    },
    {
      accessorKey: "container_details.eWay_bill",
      header: "eWay Bill",
      size: 150,
      enableColumnFilter: true,
    },

    {
      accessorKey: "container_details.lr_completed",
      header: "LR Completed",
      size: 150,
      enableColumnFilter: true,
    },
  ];
  return columns;
};

export default usePrJobColumns;
