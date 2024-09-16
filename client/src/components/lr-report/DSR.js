// import React, { useEffect, useState, useCallback } from "react";
// import axios from "axios";
// import { MaterialReactTable } from "material-react-table";
// import useTableConfig from "../../customHooks/useTableConfig";
// import { TextField, MenuItem, IconButton } from "@mui/material";
// import { srccDsrStatus } from "../../assets/data/dsrDetailedStatus";
// import SaveIcon from "@mui/icons-material/Save";

// function DSR() {
//   const [rows, setRows] = useState([]);

//   const getData = useCallback(async () => {
//     const res = await axios.get(
//       `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`
//     );
//     setRows(res.data);
//   }, []);

//   useEffect(() => {
//     getData();
//   }, [getData]);

//   const handleInputChange = (event, rowIndex, columnId) => {
//     const { value } = event.target;

//     setRows((prevRows) => {
//       const newRows = [...prevRows];
//       newRows[rowIndex][columnId] = value;

//       return newRows;
//     });
//   };

//   const handleSave = async (row) => {
//     const res = await axios.post(
//       `${process.env.REACT_APP_API_STRING}/update-srcc-dsr`,
//       row
//     );
//     alert(res.data.message);
//   };

//   const columns = [
//     {
//       accessorKey: "tr_no",
//       header: "LR No",
//       enableSorting: false,
//       size: 160,
//     },
//     {
//       accessorKey: "container_number",
//       header: "Container No",
//       enableSorting: false,
//       size: 150,
//     },
//     {
//       accessorKey: "consignor",
//       header: "Consignor",
//       enableSorting: false,
//       size: 250,
//     },
//     {
//       accessorKey: "consignee",
//       header: "Consignee",
//       enableSorting: false,
//       size: 250,
//     },
//     {
//       accessorKey: "goods_delivery",
//       header: "Goods Delivery",
//       enableSorting: false,
//       size: 150,
//     },
//     {
//       accessorKey: "branch",
//       header: "Branch",
//       enableSorting: false,
//       size: 120,
//     },
//     {
//       accessorKey: "vehicle_no",
//       header: "Vehicle No",
//       enableSorting: false,
//       size: 120,
//     },
//     {
//       accessorKey: "driver_name",
//       header: "Driver Name",
//       enableSorting: false,
//       size: 130,
//     },
//     {
//       accessorKey: "driver_phone",
//       header: "Driver Phone",
//       enableSorting: false,
//       size: 130,
//     },
//     {
//       accessorKey: "shipping_line",
//       header: "Shipping Line",
//       enableSorting: false,
//       size: 200,
//     },
//     {
//       accessorKey: "container_offloading",
//       header: "Container Offloading",
//       enableSorting: false,
//       size: 200,
//     },
//     {
//       accessorKey: "do_validity",
//       header: "DO Validity",
//       enableSorting: false,
//       size: 120,
//     },
//     {
//       accessorKey: "status",
//       header: "Status",
//       enableSorting: false,
//       size: 300,
//       Cell: ({ cell, row }) => (
//         <TextField
//           select
//           fullWidth
//           label="Status"
//           size="small"
//           defaultValue={cell.getValue()}
//           onBlur={(event) =>
//             handleInputChange(event, row.index, cell.column.id)
//           }
//         >
//           {srccDsrStatus.map((item) => (
//             <MenuItem value={item}>{item}</MenuItem>
//           ))}
//         </TextField>
//       ),
//     },
//     {
//       accessorKey: "action",
//       header: "Save",
//       enableSorting: false,
//       size: 80,
//       Cell: ({ cell, row }) => (
//         <IconButton onClick={() => handleSave(row.original)}>
//           <SaveIcon sx={{ color: "#015C4B" }} />
//         </IconButton>
//       ),
//     },
//   ];

//   const table = useTableConfig(rows, columns);

//   return (
//     <div style={{ width: "100%" }}>
//       <MaterialReactTable table={table} />
//     </div>
//   );
// }

// export default React.memo(DSR);

import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { TextField, MenuItem, IconButton } from "@mui/material";
import { srccDsrStatus } from "../../assets/data/dsrDetailedStatus";
import SaveIcon from "@mui/icons-material/Save";

function DSR() {
  const [rows, setRows] = useState([]);

  const getData = useCallback(async () => {
    const res = await axios.get(
      `${process.env.REACT_APP_API_STRING}/view-srcc-dsr`
    );
    const sortedRows = res.data.sort((a, b) => {
      const aNumber = parseInt(a.tr_no.split("/")[2], 10);
      const bNumber = parseInt(b.tr_no.split("/")[2], 10);
      return bNumber - aNumber; // descending order
    });
    setRows(sortedRows);
  }, []);

  useEffect(() => {
    getData();
  }, [getData]);

  const handleInputChange = (event, rowIndex, columnId) => {
    const { value } = event.target;

    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex][columnId] = value;

      return newRows;
    });
  };

  const handleSave = async (row) => {
    try {
      // First, check if the status is "Successful Collection of SR-CEL Lock"
      if (
        row.status === "Successful Collection of SR-CEL Lock" &&
        row.sr_cel_id
      ) {
        // Update the sr_cel_locked field
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/get-srcel/${row.sr_cel_id}`,
          {
            sr_cel_locked: false,
          }
        );
        console.log("SR CEL Locked successfully");
      }

      // Save the row data
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-srcc-dsr`,
        row
      );

      // Notify the user of success
      alert(res.data.message);
    } catch (error) {
      console.error("Error during save:", error);
      alert("There was an error saving the data. Please try again.");
    }
  };

  const columns = [
    {
      accessorKey: "tr_no",
      header: "LR No",
      enableSorting: false,
      size: 160,
    },
    {
      accessorKey: "container_number",
      header: "Container No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "sr_cel_no",
      header: "SR-CEL No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "branch",
      header: "Branch",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "vehicle_no",
      header: "Vehicle No",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "driver_phone",
      header: "Driver Phone",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "shipping_line",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "container_offloading",
      header: "Container Offloading",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 300,
      Cell: ({ cell, row }) => {
        const currentValue = cell.getValue();
        const options = srccDsrStatus.includes(currentValue)
          ? srccDsrStatus
          : [currentValue, ...srccDsrStatus];

        return (
          <TextField
            select
            fullWidth
            label="Status"
            size="small"
            defaultValue={currentValue}
            onBlur={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
          >
            {options.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 80,
      Cell: ({ cell, row }) => (
        <IconButton onClick={() => handleSave(row.original)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  const table = useTableConfig(rows, columns);

  return (
    <div style={{ width: "100%" }}>
      <MaterialReactTable table={table} />
    </div>
  );
}

export default React.memo(DSR);
