import * as React from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  IconButton,
  Checkbox,
  Modal,
  TextField,
  Box,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useNavigate } from "react-router-dom";

function Submission() {
  const [rows, setRows] = React.useState([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [openDocumentModal, setOpenDocumentModal] = React.useState(false);
  const [currentRowIndex, setCurrentRowIndex] = React.useState(null);
  const [submissionQueries, setSubmissionQueries] = React.useState([]);
  const [currentDocumentRow, setCurrentDocumentRow] = React.useState(null);

  const navigate = useNavigate();

  React.useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-submission-jobs`
      );
      setRows(res.data);
    }

    getData();
  }, []);

  const handleSave = async (row) => {
    console.log("Save row:", row);
    const res = await axios.post(
      `${process.env.REACT_APP_API_STRING}/update-submission-job`,
      row
    );
    alert(res.data.message);
  };

  const handleEditClick = (rowIndex) => {
    setCurrentRowIndex(rowIndex);
    setSubmissionQueries(rows[rowIndex].submissionQueries || []);
    setOpenModal(true);
  };

  const handleDateChange = (event, rowIndex, field) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][field] = event.target.value;
    setRows(updatedRows);
  };

  const handleSubmissionDateChange = (event, rowIndex) => {
    const updatedRows = [...rows];
    if (event.target.checked) {
      updatedRows[rowIndex].submission_date = new Date()
        .toISOString()
        .split("T")[0];
    } else {
      updatedRows[rowIndex].submission_date = null;
    }
    setRows(updatedRows);
  };

  const handleModalClose = () => {
    setOpenModal(false);
  };

  const handleDocumentModalClose = () => {
    setOpenDocumentModal(false);
  };

  const handleAddQuery = () => {
    setSubmissionQueries([...submissionQueries, { query: "", reply: "" }]);
  };

  const handleQueryChange = (index, field, value) => {
    const updatedQueries = [...submissionQueries];
    updatedQueries[index][field] = value;
    setSubmissionQueries(updatedQueries);
  };

  const handleSubmitQueries = () => {
    setRows((prevRows) =>
      prevRows?.map((row, index) =>
        index === currentRowIndex ? { ...row, submissionQueries } : row
      )
    );
    setOpenModal(false);
  };

  const handleDocumentClick = (row) => {
    setCurrentDocumentRow(row); // Set the current row data
    setOpenDocumentModal(true); // Open the modal
  };

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const { job_no, year, type_of_b_e, consignment_type, custom_house } =
          row.original;

        return (
          <div
            onClick={() => navigate(`/submission-job/${job_no}/${year}`)}
            style={{
              cursor: "pointer",
              color: "blue",
            }}
          >
            {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />
            {custom_house}
          </div>
        );
      },
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "gateway_igm_date",
      header: "Gateway IGM NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { gateway_igm_date = "N/A", gateway_igm = "N/A" } = row.original;
        return (
          <div>
            <div>{`${gateway_igm}`}</div>
            <div>{`${gateway_igm_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "igm_no",
      header: "IGM NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { igm_date = "N/A", igm_no = "N/A" } = row.original;
        return (
          <div>
            <div>{`${igm_no}`}</div>
            <div>{`${igm_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice NO. & Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => {
        const { invoice_date = "N/A", invoice_number = "N/A" } = row.original;
        return (
          <div>
            <div>{`${invoice_number}`}</div>
            <div>{`${invoice_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Num & Date",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => {
        const { awb_bl_no = "N/A", awb_bl_date = "N/A" } = row.original;
        return (
          <div>
            <div>{`${awb_bl_no}`}</div>
            <div>{`${awb_bl_date}`}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "container_numbers",
      header: "Container Numbers and Size",
      size: 200,
      Cell: ({ cell }) => {
        const containerNos = cell.row.original.container_nos;
        return (
          <React.Fragment>
            {containerNos?.map((container, id) => (
              <div key={id} style={{ marginBottom: "4px" }}>
                {container.container_number}| "{container.size}"
              </div>
            ))}
          </React.Fragment>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: { density: "compact", pagination: { pageSize: 20 } },
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />
      <Modal open={openModal} onClose={handleModalClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            height: 600,
            transform: "translate(-50%, -50%)",
            width: 800,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            overflowY: "auto",
          }}
        >
          <div>
            {submissionQueries?.map((item, index) => (
              <div key={index} style={{ marginBottom: "20px" }}>
                <TextField
                  label="Query"
                  multiline
                  rows={2}
                  value={item.query}
                  fullWidth
                  margin="normal"
                  onChange={(e) =>
                    handleQueryChange(index, "query", e.target.value)
                  }
                />
                {item.reply}
              </div>
            ))}
          </div>

          <button className="btn" onClick={handleAddQuery}>
            Add New Query
          </button>

          <div style={{ marginTop: "20px" }}>
            <button
              className="btn"
              onClick={handleSubmitQueries}
              style={{ marginRight: "10px" }}
            >
              Submit
            </button>
            <button className="btn" onClick={handleModalClose}>
              Cancel
            </button>
          </div>
        </Box>
      </Modal>

      <Modal open={openDocumentModal} onClose={handleDocumentModalClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            height: 600,
            transform: "translate(-50%, -50%)",
            width: 800,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            overflowY: "auto",
          }}
        >
          <h4>Documents</h4>
          {currentDocumentRow && (
            <div>
              {currentDocumentRow.cth_documents?.map((doc, index) => (
                <div key={index}>
                  <p>
                    <strong>{doc.document_name}:&nbsp;</strong>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    )}
                  </p>
                </div>
              ))}
              {currentDocumentRow.documents?.map((doc, index) => (
                <div key={index}>
                  <p>
                    <strong>{doc.document_name}:&nbsp;</strong>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Box>
      </Modal>
    </div>
  );
}

export default React.memo(Submission);
