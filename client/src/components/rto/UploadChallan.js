import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useFormik } from "formik";
import axios from "axios";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import * as Yup from "yup";
import {
  Button,
  TextField,
  Box,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  DialogContentText,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Autocomplete from "@mui/material/Autocomplete";

function UploadChallan() {
  const [truckNo, setTruckNo] = useState([]);
  const [selectedTruckNo, setSelectedTruckNo] = useState("");
  const [truckNoError, setTruckNoError] = useState("");
  const [rows, setRows] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editingChallan, setEditingChallan] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    severity: "info",
  });
  const apiBaseURL = `${process.env.REACT_APP_API_STRING}`;
  const addrtoChallans = `${apiBaseURL}/vehicle/${selectedTruckNo}/add-challan`;
  const getTruckNumberAPI = `${apiBaseURL}/get-vehicles`;
  const deleteRtoChallan = `${apiBaseURL}/vehicle/${selectedTruckNo}/delete-challan`;
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function getTruckNumber() {
      try {
        const res = await axios.get(getTruckNumberAPI);
        setTruckNo(res.data.map((item) => item.truck_no));
      } catch (error) {
        console.error("Failed to fetch truck numbers:", error);
        setAlert({
          show: true,
          message: "Failed to fetch truck numbers. Please try again.",
          severity: "error",
        });
      }
    }
    getTruckNumber();
  }, [getTruckNumberAPI]);

  const formik = useFormik({
    initialValues: {
      challan_no: "",
      challan_date: "",
      challan_amount: "",
      challan_driver_contact: "",
      challan_reason: "",
      challan_location: "",
      challan_document: [],
    },
    validationSchema: Yup.object({
      challan_no: Yup.string().required("Challan number is required"),
      challan_date: Yup.date().max(today, "Date cannot be in the future"),
      challan_amount: Yup.number().required("Amount is required"),
      challan_driver_contact: Yup.string().required(
        "Driver contact is required"
      ),
      challan_reason: Yup.string().required("Reason is required"),
      challan_location: Yup.string().required("Location is required"),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!selectedTruckNo) {
        setTruckNoError("Truck number is required");
        return;
      }

      const existingChallan = rows.find(
        (challan) => challan.challan_no === values.challan_no
      );

      if (existingChallan) {
        setConfirmOverride(true);
        return;
      }

      try {
        const response = await axios.post(addrtoChallans, {
          ...values,
          truck_no: selectedTruckNo,
        });
        if (response.data.success) {
          setAlert({
            show: true,
            message: response.data.message,
            severity: "success",
          });
          // Add the new challan to the rows
          setRows([...rows, { ...values, _id: response.data.data._id }]);
          resetForm();
          setIsAddMode(false);
        }
      } catch (error) {
        console.error("Failed to save challan data:", error);
        setAlert({
          show: true,
          message: "Failed to save challan data. Please try again.",
          severity: "error",
        });
      }
    },
  });
  const handleOverrideConfirm = async () => {
    try {
      const response = await axios.post(addrtoChallans, {
        ...formik.values,
        truck_no: selectedTruckNo,
      });
      if (response.data.success) {
        // Update the specific challan in the rows array
        const updatedChallans = rows.map((challan) =>
          challan.challan_no === formik.values.challan_no
            ? { ...formik.values, _id: challan._id }
            : challan
        );
        setRows(updatedChallans);
        setEditingChallan(null);
        setConfirmOverride(false);
        formik.resetForm();
        setIsAddMode(false);
        setAlert({
          show: true,
          message: response.data.message,
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Failed to update challan:", error);
      setAlert({
        show: true,
        message: "Failed to update challan. Please try again.",
        severity: "error",
      });
    }
  };

  const handleTruckNoChange = async (event, value) => {
    setSelectedTruckNo(value || "");
    setTruckNoError("");
    if (value) {
      try {
        const response = await axios.get(
          `${apiBaseURL}/vehicle/${value}/get-challans`
        );
        if (response.data.success) {
          setRows(response.data.data);
          setIsUpdating(true);
          setAlert({
            show: true,
            message: "Data loaded successfully. You can now update.",
            severity: "success",
          });
        } else {
          setRows([]);
          setIsUpdating(false);
          setAlert({
            show: true,
            message:
              "No existing challans found for this truck. You can add new challans.",
            severity: "info",
          });
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setRows([]);
          setIsUpdating(false);
          setAlert({
            show: true,
            message:
              "No data found for the selected truck number. You can add new challans.",
            severity: "info",
          });
        } else {
          console.error("Failed to fetch data:", error);
          setAlert({
            show: true,
            message: "Failed to fetch data. Please try again.",
            severity: "error",
          });
        }
      }
    } else {
      setRows([]);
      setIsUpdating(false);
    }
  };

  const handleEditChallan = (challan) => {
    setEditingChallan(challan);
    formik.setValues({
      ...challan,
    });
    setIsAddMode(false);
  };

  const handleDeleteChallan = (index) => {
    setDeleteIndex(index);
    setOpen(true);
  };

  const confirmDeleteChallan = async () => {
    const challanToDelete = rows[deleteIndex];
    try {
      await axios.delete(`${deleteRtoChallan}/${challanToDelete.challan_no}`);
      const newChallans = rows.filter((_, index) => index !== deleteIndex);
      setRows(newChallans);
      // toast.success("Challan deleted successfully");
    } catch (error) {
      console.error("Failed to delete challan:", error);
      // toast.error("Failed to delete challan. Please try again.");
    }
    setOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedTruckNo) {
      setTruckNoError("Truck number is required");
      return;
    }
    try {
      const response = await axios.post(addrtoChallans, {
        ...formik.values,
        truck_no: selectedTruckNo,
      });
      if (response.status === 200) {
        const updatedChallans = rows.map((challan) =>
          challan.challan_no === formik.values.challan_no
            ? {
                ...formik.values,
                challan_document: formik.values.challan_document || [],
              }
            : challan
        );
        setRows(updatedChallans);
        setEditingChallan(null);
        // toast.success("Challan updated successfully");
      }
    } catch (error) {
      console.error("Failed to update challan:", error);
      // toast.error("Failed to update challan. Please try again.");
    }
  };

  const handleFileUpload = async (event, fieldName) => {
    const files = event.target.files;
    const uploadedFiles = [...(formik.values[fieldName] || [])];

    for (const file of files) {
      try {
        console.log(`Attempting to upload file: ${file.name}`);
        const result = await uploadFileToS3(file, "rto");
        console.log("S3 upload result:", result);

        if (result && result.Location) {
          uploadedFiles.push(result.Location);
          console.log(`File uploaded successfully. URL: ${result.Location}`);
        } else {
          console.error(
            "Upload successful but Location is missing from the result"
          );
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // You might want to show an error message to the user here
      }
    }

    console.log("All uploaded files:", uploadedFiles);
    formik.setFieldValue(fieldName, uploadedFiles);
  };

  const handleDeleteImage = (fieldName, index) => {
    console.log("Image deleted start");
    const currentFieldValue = formik.values[fieldName] || [];
    const newImages = [...currentFieldValue];
    newImages.splice(index, 1);
    formik.setFieldValue(fieldName, newImages);
    console.log("Image deleted successfully");

    // toast.success("Image deleted successfully.");
  };

  const ConfirmDialog = ({ open, handleClose, handleConfirm, message }) => (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Are you sure?"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleConfirm} color="primary" autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderImagePreview = (fieldName) => {
    const links = (formik.values[fieldName] || []).filter(
      (link) => link.trim() !== ""
    );
    if (links.length === 0) return null;

    const handleClickOpen = (index, fieldName) => {
      setDeleteIndex(index);
      setCurrentField(fieldName);
      setOpenImageDeleteModal(true);
    };
    const handleClose = () => {
      setOpenImageDeleteModal(false);
    };

    const handleConfirm = () => {
      handleDeleteImage(currentField, deleteIndex);
      setOpenImageDeleteModal(false);
    };

    return (
      <Box mt={1} style={{ maxHeight: "150px", overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Link</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {links.map((link, index) => (
              <TableRow key={index}>
                <TableCell>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {link}
                  </a>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleClickOpen(index, fieldName)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ConfirmDialog
          open={openImageDeleteModal}
          handleClose={handleClose}
          handleConfirm={handleConfirm}
          message={`Are you sure you want to delete this image from the server as well?`}
        />
      </Box>
    );
  };

  const columns = [
    {
      accessorKey: "actions",
      header: "Actions",
      enableSorting: false,
      size: 100,
      Cell: ({ row }) => (
        <Box>
          <IconButton onClick={() => handleEditChallan(row.original)}>
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteChallan(row.index)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
    {
      accessorKey: "challan_no",
      header: "Challan No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "challan_date",
      header: "Date",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "challan_amount",
      header: "Amount",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "challan_driver_contact",
      header: "Driver Contact",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "challan_reason",
      header: "Reason",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "challan_document",
      header: "Doc view",
      enableSorting: false,
      size: 200,
      Cell: ({ cell }) => (
        <Box>
          {cell.getValue()?.map((link, index) => (
            <a
              key={index} // Added the key attribute here
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", marginBottom: "5px" }}
            >
              Document {index + 1}
            </a>
          ))}
        </Box>
      ),
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: {
      density: "compact",
    },
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    muiTableContainerProps: {
      sx: { maxHeight: "600px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbar: () => <></>,
  });

  return (
    <div>
      {/* <ToastContainer position="top-center" autoClose={3000} /> */}
      <Autocomplete
        disablePortal
        options={Array.isArray(truckNo) ? truckNo : []}
        getOptionLabel={(option) => option}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="filled"
            label="Select truck number *"
            error={Boolean(truckNoError)}
            helperText={truckNoError}
          />
        )}
        value={selectedTruckNo}
        onChange={handleTruckNoChange}
        fullWidth
      />

      <MaterialReactTable table={table} />
      <br />
      {selectedTruckNo && (
        <button
          className="btn"
          onClick={() => {
            setEditingChallan(null);
            formik.resetForm();
            setIsAddMode(true);
          }}
        >
          Add Challan
        </button>
      )}

      <Dialog
        open={Boolean(editingChallan) || isAddMode}
        onClose={() => {
          setEditingChallan(null);
          setIsAddMode(false);
          formik.resetForm();
        }}
      >
        <DialogTitle>{isAddMode ? "Add Challan" : "Edit Challan"}</DialogTitle>
        <DialogContent>
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Challan No"
              name="challan_no"
              value={formik.values.challan_no}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_no && Boolean(formik.errors.challan_no)
              }
              helperText={formik.touched.challan_no && formik.errors.challan_no}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Date"
              name="challan_date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formik.values.challan_date}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_date &&
                Boolean(formik.errors.challan_date)
              }
              helperText={
                formik.touched.challan_date && formik.errors.challan_date
              }
              inputProps={{ max: today }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Amount"
              name="challan_amount"
              type="number"
              value={formik.values.challan_amount}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_amount &&
                Boolean(formik.errors.challan_amount)
              }
              helperText={
                formik.touched.challan_amount && formik.errors.challan_amount
              }
            />
            <TextField
              fullWidth
              margin="normal"
              label="Driver Contact"
              name="challan_driver_contact"
              value={formik.values.challan_driver_contact}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_driver_contact &&
                Boolean(formik.errors.challan_driver_contact)
              }
              helperText={
                formik.touched.challan_driver_contact &&
                formik.errors.challan_driver_contact
              }
            />
            <TextField
              fullWidth
              margin="normal"
              label="Reason"
              name="challan_reason"
              value={formik.values.challan_reason}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_reason &&
                Boolean(formik.errors.challan_reason)
              }
              helperText={
                formik.touched.challan_reason && formik.errors.challan_reason
              }
            />
            <TextField
              fullWidth
              margin="normal"
              label="Location"
              name="challan_location"
              value={formik.values.challan_location}
              onChange={formik.handleChange}
              error={
                formik.touched.challan_location &&
                Boolean(formik.errors.challan_location)
              }
              helperText={
                formik.touched.challan_location &&
                formik.errors.challan_location
              }
            />
            {/* <input
              type="file"
              multiple
              onChange={(event) => handleFileUpload(event, "challan_document")}
            />
            {renderImagePreview("challan_document")} */}

            <Box mt={1}>
              {/* Hidden file input */}
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="file-upload-challan_document"
                multiple
                type="file"
                onChange={(event) =>
                  handleFileUpload(event, "challan_document")
                }
              />
              {/* Label to trigger the file input */}
              <label htmlFor="file-upload-challan_document">
                <Button
                  style={{
                    padding: "5px 10px",
                    border: "none",
                    outline: "none",
                    backgroundColor: "#273041",
                    color: "#fff",
                  }}
                  component="span"
                >
                  Upload Challan Document
                </Button>
              </label>
              {/* Render image preview */}
              {renderImagePreview("challan_document")}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditingChallan(null);
              setIsAddMode(false);
              formik.resetForm();
            }}
          >
            Cancel
          </Button>
          <Button onClick={isAddMode ? formik.handleSubmit : handleSaveEdit}>
            {isAddMode ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOverride}
        onClose={() => setConfirmOverride(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Override"}</DialogTitle>
        <DialogContent>
          Challan number already exists. Do you want to override this details?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOverride(false)}>Cancel</Button>
          <Button onClick={handleOverrideConfirm} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this challan?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteChallan} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default UploadChallan;
