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

function Submission() {
  const [rows, setRows] = React.useState([]);
  const [openModal, setOpenModal] = React.useState(false);
  const [openDocumentModal, setOpenDocumentModal] = React.useState(false);
  const [currentRowIndex, setCurrentRowIndex] = React.useState(null);
  const [submissionQueries, setSubmissionQueries] = React.useState([]);
  const [currentDocumentRow, setCurrentDocumentRow] = React.useState(null);

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
      size: 100,
    },
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "custom_house",
      header: "Custom House",
      enableSorting: false,
      size: 150,
    },

    {
      accessorKey: "gateway_igm_date",
      header: "Gateway IGM Date",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "discharge_date",
      header: "Discharge Date/ IGM Date",
      enableSorting: false,
      size: 130,
    },
    {
      accessorKey: "checklist_verified_on",
      header: "Checklist Verified On",
      enableSorting: false,
      size: 160,
      Cell: ({ row }) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <TextField
            type="date"
            size="small"
            value={row.original.checklist_verified_on || ""}
            onChange={(event) =>
              handleDateChange(event, row.index, "checklist_verified_on")
            }
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
      ),
    },
    {
      accessorKey: "submission_date",
      header: "Submission Date",
      enableSorting: false,
      size: 130,
      Cell: ({ row }) => (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Checkbox
            checked={!!row.original.submission_date}
            onChange={(event) => handleSubmissionDateChange(event, row.index)}
          />
          {row.original.submission_date && (
            <Typography sx={{ ml: 2, mt: 3 }}>
              {new Date(row.original.submission_date).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      accessorKey: "queries",
      header: "Queries",
      enableSorting: false,
      size: 100,
      Cell: ({ row }) => (
        <IconButton onClick={() => handleEditClick(row.index)}>
          <EditIcon />
        </IconButton>
      ),
    },
    {
      accessorKey: "documents",
      header: "Documents",
      enableSorting: false,
      size: 150,
      Cell: ({ row }) => (
        <IconButton onClick={() => handleDocumentClick(row.original)}>
          <InsertDriveFileIcon />
        </IconButton>
      ),
    },
    {
      accessorKey: "save",
      header: "Save",
      enableSorting: false,
      size: 80,
      Cell: ({ row }) => (
        <IconButton onClick={() => handleSave(row.original)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
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
