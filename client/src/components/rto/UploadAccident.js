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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Autocomplete from "@mui/material/Autocomplete";

function UploadAccident() {
  const [truckNo, setTruckNo] = useState([]);
  const [selectedTruckNo, setSelectedTruckNo] = useState("");
  const [truckNoError, setTruckNoError] = useState("");
  const [rows, setRows] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [editingAccident, setEditingAccident] = useState(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);

  const apiBaseURL = `${process.env.REACT_APP_API_STRING}`;
  const addrtoAccidents = `${apiBaseURL}/vehicle/${selectedTruckNo}/add-accident`;
  const getTruckNumberAPI = `${apiBaseURL}/get-vehicles`;
  const getTypeOfVehiclesAPI = `${apiBaseURL}/get-type-of-vehicles`;
  const deleteRtoAccident = `${apiBaseURL}/vehicle/${selectedTruckNo}/delete-accident`;
  console.log(vehicleTypeOptions);

  const now = new Date();
  const todayDate = now.toISOString().split("T")[0]; // Local date in YYYY-MM-DD
  const todayTime = now.toISOString().split("T")[1].slice(0, 5); // Local time in HH:MM
  console.log(todayDate, todayTime);
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await axios.get(getTypeOfVehiclesAPI);
        setVehicleTypeOptions(response.data);
      } catch (error) {
        console.error("Error fetching vehicle types:", error);
      }
    };

    fetchVehicleTypes();
  }, [getTypeOfVehiclesAPI]);
  useEffect(() => {
    async function getTruckNumber() {
      try {
        const res = await axios.get(getTruckNumberAPI);
        setTruckNo(res.data.map((item) => item.truck_no));
      } catch (error) {
        console.error("Failed to fetch truck numbers:", error);
        // toast.error("Failed to fetch truck numbers. Please try again.");
      }
    }
    getTruckNumber();
  }, [getTruckNumberAPI]);

  const formik = useFormik({
    initialValues: {
      third_party_vehicle_no: "",
      date: "",
      time: "",
      driver_name: "",
      opposite_party_name: "",
      vehicle_type: "",
      insured: "",
      location: "",
      settlement_amount: "",
      remarks: "",
      image: [],
    },
    validationSchema: Yup.object({
      third_party_vehicle_no: Yup.string()
        .matches(
          /^[A-Za-z]{2}\d{2}[A-Za-z]{2}\d{4}$/,
          "Vehicle number must be in the format MH12CC1234"
        )
        .required("Vehicle number is required"),
      date: Yup.date().required("Date cannot be in the future"),
      time: Yup.string().required("Time cannot be in the future"),
      driver_name: Yup.string().required("Driver name is required"),
      opposite_party_name: Yup.string().required(
        "Opposite party name is required"
      ),
      vehicle_type: Yup.string().required("Vehicle type is required"),
      insured: Yup.string().required("Insured status is required"),
      location: Yup.string().required("Location is required"),
      settlement_amount: Yup.number().required("Settlement amount is required"),
      remarks: Yup.string(),
    }),
    onSubmit: async (values, { resetForm }) => {
      if (!selectedTruckNo) {
        setTruckNoError("Truck number is required");
        return;
      }

      if (isAddMode) {
        const existingAccident = rows.find(
          (accident) =>
            accident.date === values.date && accident.time === values.time
        );

        if (existingAccident) {
          setConfirmOverride(true);
          return;
        }

        try {
          const response = await axios.post(`${addrtoAccidents}`, {
            ...values,
            truck_no: selectedTruckNo,
          });
          if (response.data.success) {
            setRows([...rows, { ...values, _id: response.data.data._id }]);
            resetForm();
            setIsAddMode(false);
          }
        } catch (error) {
          console.error("Failed to save accident data:", error);
        }
      } else {
        try {
          const response = await axios.post(`${addrtoAccidents}`, {
            ...values,
            truck_no: selectedTruckNo,
          });
          if (response.status === 200) {
            const updatedAccidents = rows.map((accident) =>
              accident.date === values.date && accident.time === values.time
                ? {
                    ...values,
                    image: values.image || [],
                  }
                : accident
            );
            setRows(updatedAccidents);
            setEditingAccident(null);
            resetForm();
            setIsAddMode(false);
          }
        } catch (error) {
          console.error("Failed to update accident:", error);
        }
      }
    },
  });

  const handleOverrideConfirm = async () => {
    try {
      const response = await axios.post(`${addrtoAccidents}`, {
        ...formik.values,
        truck_no: selectedTruckNo,
      });
      if (response.status === 200) {
        const updatedAccidents = rows.map((accident) =>
          accident.date === formik.values.date &&
          accident.time === formik.values.time
            ? formik.values
            : accident
        );
        setRows(updatedAccidents);
        setEditingAccident(null);
        setConfirmOverride(false);
        formik.resetForm();
        setIsAddMode(false);
        // toast.success("Accident updated successfully");
      }
    } catch (error) {
      console.error("Failed to update accident:", error);
      // toast.error("Failed to update accident. Please try again.");
    }
  };

  const handleTruckNoChange = async (event, value) => {
    setSelectedTruckNo(value || "");
    setTruckNoError("");
    if (value) {
      try {
        // const response = await axios.get(`${getAccidents}/${value}`);
        const response = await axios.get(
          `${apiBaseURL}/vehicle/${value}/get-accidents`
        );
        if (response.data.success) {
          setRows(response.data.data);
          setIsUpdating(true);
        } else {
          setRows([]);
          setIsUpdating(false);
          setIsUpdating(false);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setRows([]);
          setIsUpdating(false);
        } else {
          console.error("Failed to fetch data:", error);
        }
      }
    } else {
      setRows([]);
      setIsUpdating(false);
    }
  };

  const handleEditAccident = (accident) => {
    setEditingAccident(accident);
    formik.setValues({
      ...accident,
    });
    setIsAddMode(false);
  };

  const handleDeleteAccident = (index) => {
    setDeleteIndex(index);
    setOpen(true);
  };

  const confirmDeleteAccident = async () => {
    const accidentToDelete = rows[deleteIndex];
    try {
      await axios.delete(
        `${deleteRtoAccident}/${accidentToDelete.date}/${accidentToDelete.time}`
      );
      const newAccidents = rows.filter((_, index) => index !== deleteIndex);
      setRows(newAccidents);
    } catch (error) {
      console.error("Failed to delete accident:", error);
    }
    setOpen(false);
  };

  const handleFileUpload = async (event, fieldName) => {
    const files = event.target.files;
    const uploadedFiles = [...(formik.values[fieldName] || [])];

    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, "accidents");
        uploadedFiles.push(result.Location);
      } catch (error) {
        // toast.error(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    formik.setFieldValue(fieldName, uploadedFiles);
  };

  const handleDeleteImage = (fieldName, index) => {
    const currentFieldValue = formik.values[fieldName] || [];
    const newImages = [...currentFieldValue];
    newImages.splice(index, 1);
    formik.setFieldValue(fieldName, newImages);
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
          <IconButton onClick={() => handleEditAccident(row.original)}>
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={() => handleDeleteAccident(row.index)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
    {
      accessorKey: "third_party_vehicle_no",
      header: "Third Party Vehicle No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "date",
      header: "Date",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "time",
      header: "Time",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "driver_name",
      header: "Driver Name",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "opposite_party_name",
      header: "Opposite Party Name",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "vehicle_type",
      header: "Vehicle Type",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "insured",
      header: "Insured",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "location",
      header: "Location",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "settlement_amount",
      header: "Settlement Amount",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "image",
      header: "Images",
      enableSorting: false,
      size: 200,
      Cell: ({ cell }) => (
        <Box>
          {cell.getValue()?.map((link, index) => (
            <a
              key={index}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", marginBottom: "5px" }}
            >
              Image {index + 1}
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
            setEditingAccident(null);
            formik.resetForm();
            setIsAddMode(true);
          }}
        >
          Add Accident
        </button>
      )}

      <Dialog
        open={Boolean(editingAccident) || isAddMode}
        onClose={() => {
          setEditingAccident(null);
          setIsAddMode(false);
          formik.resetForm();
        }}
      >
        <DialogTitle>
          {isAddMode ? "Add Accident" : "Edit Accident"}
        </DialogTitle>
        <DialogContent>
          <Box>
            <TextField
              fullWidth
              margin="normal"
              label="Third Party Vehicle No"
              name="third_party_vehicle_no"
              value={formik.values.third_party_vehicle_no}
              onChange={formik.handleChange}
              error={
                formik.touched.third_party_vehicle_no &&
                Boolean(formik.errors.third_party_vehicle_no)
              }
              helperText={
                formik.touched.third_party_vehicle_no &&
                formik.errors.third_party_vehicle_no
              }
            />
            <TextField
              fullWidth
              margin="normal"
              label="Date"
              name="date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formik.values.date}
              onChange={formik.handleChange}
              error={formik.touched.date && Boolean(formik.errors.date)}
              helperText={formik.touched.date && formik.errors.date}
              inputProps={{ max: todayDate }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Time"
              name="time"
              type="time"
              InputLabelProps={{ shrink: true }}
              value={formik.values.time}
              onChange={formik.handleChange}
              error={formik.touched.time && Boolean(formik.errors.time)}
              helperText={formik.touched.time && formik.errors.time}
              inputProps={{ max: todayTime }}
            />
            
            <TextField
              fullWidth
              margin="normal"
              label="Driver Name"
              name="driver_name"
              value={formik.values.driver_name}
              onChange={formik.handleChange}
              error={
                formik.touched.driver_name && Boolean(formik.errors.driver_name)
              }
              helperText={
                formik.touched.driver_name && formik.errors.driver_name
              }
            />
            <TextField
              fullWidth
              margin="normal"
              label="Opposite Party Name"
              name="opposite_party_name"
              value={formik.values.opposite_party_name}
              onChange={formik.handleChange}
              error={
                formik.touched.opposite_party_name &&
                Boolean(formik.errors.opposite_party_name)
              }
              helperText={
                formik.touched.opposite_party_name &&
                formik.errors.opposite_party_name
              }
            />

            <Autocomplete
              margin="normal"
              label="Vehicle Type"
              name="vehicle_type"
              fullWidth
              options={vehicleTypeOptions}
              value={formik.values.vehicle_type}
              onChange={(event, newValue) => {
                formik.setFieldValue("vehicle_type", newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  margin="normal"
                  label="Vehicle Type"
                  name="vehicle_type"
                  error={
                    formik.touched.vehicle_type &&
                    Boolean(formik.errors.vehicle_type)
                  }
                  helperText={
                    formik.touched.vehicle_type && formik.errors.vehicle_type
                  }
                />
              )}
            />

            <TextField
              fullWidth
              margin="normal"
              label="Insured"
              name="insured"
              value={formik.values.insured}
              onChange={formik.handleChange}
              error={formik.touched.insured && Boolean(formik.errors.insured)}
              helperText={formik.touched.insured && formik.errors.insured}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Location"
              name="location"
              value={formik.values.location}
              onChange={formik.handleChange}
              error={formik.touched.location && Boolean(formik.errors.location)}
              helperText={formik.touched.location && formik.errors.location}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Settlement Amount"
              name="settlement_amount"
              type="number"
              value={formik.values.settlement_amount}
              onChange={formik.handleChange}
              error={
                formik.touched.settlement_amount &&
                Boolean(formik.errors.settlement_amount)
              }
              helperText={
                formik.touched.settlement_amount &&
                formik.errors.settlement_amount
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Remarks"
              name="remarks"
              multiline
              rows={3}
              value={formik.values.remarks}
              onChange={formik.handleChange}
              error={formik.touched.remarks && Boolean(formik.errors.remarks)}
              helperText={formik.touched.remarks && formik.errors.remarks}
            />
            <input
              type="file"
              multiple
              onChange={(event) => handleFileUpload(event, "image")}
            />
            {renderImagePreview("image")}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditingAccident(null);
              setIsAddMode(false);
              formik.resetForm();
            }}
          >
            Cancel
          </Button>
          {/* <Button onClick={isAddMode ? formik.handleSubmit : handleSaveEdit}>
            {isAddMode ? "Add" : "Save"}
          </Button> */}
          <Button
            onClick={() => {
              if (isAddMode) {
                formik.handleSubmit(); // Call Formik's handleSubmit for adding mode
              } else {
                formik.handleSubmit(); // Call Formik's handleSubmit for editing mode
              }
            }}
          >
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
          Accident with this date and time already exists. Do you want to
          override these details?
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
          Are you sure you want to delete this accident record?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteAccident} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default UploadAccident;
