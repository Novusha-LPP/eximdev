import React, { useEffect, useState } from "react";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";
import { MenuItem, TextField } from "@mui/material";

function ViewBugs() {
  const [data, setData] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState({});

  useEffect(() => {
    async function getFeedback() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-feedback`
      );
      setData(res.data);
    }
    getFeedback();
  }, []);

  const handleStatusChange = (id, value) => {
    setSelectedStatus((prevStatus) => ({
      ...prevStatus,
      [id]: value,
    }));
  };

  const handleSubmit = async (id) => {
    const status = selectedStatus[id];

    if (status) {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-feedback`,
        {
          id,
          status,
        }
      );
      alert(res.data.message);
    } else {
      alert("Please select a status");
    }
  };

  const handleImageDownload = (imageData) => {
    const downloadLink = document.createElement("a");
    downloadLink.href = imageData;
    downloadLink.download = "image.png";
    downloadLink.click();
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "module",
      header: "Module",
      enableSorting: false,
      size: 120,
    },
    {
      accessorKey: "issue",
      header: "Issue",
      enableSorting: false,
      size: 350,
    },
    {
      accessorKey: "image",
      header: "Image",
      enableSorting: false,

      Cell: ({ cell }) => (
        // eslint-disable-next-line
        <a
          href="#"
          className="link"
          onClick={() => handleImageDownload(cell.row.original.image)}
        >
          Download
        </a>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 220,

      Cell: ({ cell }) => (
        <TextField
          select
          size="small"
          onChange={(e) =>
            handleStatusChange(cell.row.original.id, e.target.value)
          }
          value={cell.row.original.selectedStatus || cell.row.original.status}
        >
          <MenuItem value="Raised">Raised</MenuItem>
          <MenuItem value="Approved">Approved</MenuItem>
          <MenuItem value="Brought to knowledge of developer">
            Brought to knowledge of developer
          </MenuItem>
          <MenuItem value="Resolved">Resolved</MenuItem>
        </TextField>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      enableSorting: false,
      size: 220,

      Cell: ({ cell }) => (
        // eslint-disable-next-line
        <a
          href="#"
          className="link"
          onClick={() => handleSubmit(cell.row.original.id)}
        >
          Submit
        </a>
      ),
    },
  ];

  const table = useTableConfig(data, columns);

  return (
    <>
      <h3>View Bugs</h3>
      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(ViewBugs);
