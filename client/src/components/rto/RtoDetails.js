import React, { useEffect, useState } from "react";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import axios from "axios";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
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
  FormControlLabel,
  Checkbox,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useFormik } from "formik";
import * as Yup from "yup";

const RtoDetails = () => {
  const [vehicles, setVehicles] = useState([]);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [openDeleteVehicleConfirmDialog, setOpenDeleteVehicleConfirmDialog] =
    useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const apiBaseURL = `${process.env.REACT_APP_API_STRING}`;
  const getVehiclesAPI = `${apiBaseURL}/get-vehicles`;
  const deleteVehicleAPI = `${apiBaseURL}/delete-vehicle`;

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line
  }, []);

  const fetchVehicles = () => {
    axios
      .get(getVehiclesAPI)
      .then((response) => {
        const formattedVehicles = (response.data || []).map((vehicle) => ({
          ...vehicle,
          ...vehicle.rto,
          mv_tax_photo: vehicle.rto?.mv_tax_photo || [],
          insurance_photo: vehicle.rto?.insurance_photo || [],
          puc_photo: vehicle.rto?.puc_photo || [],
          goods_permit_photo: vehicle.rto?.goods_permit_photo || [],
          national_permit_photo: vehicle.rto?.national_permit_photo || [],
          rc_front_photo: vehicle.rto?.rc_front_photo || [],
          rc_rear_photo: vehicle.rto?.rc_rear_photo || [],
        }));
        setVehicles(formattedVehicles);
      })
      .catch((error) => {
        console.error("API Error:", error.response || error);
      });
  };

  const validationSchema = Yup.object({
    // truck_no: Yup.string().required("Required"),
    // inspection_due_date: Yup.date().required("Required"),
    // mv_tax_date: Yup.date().required("Required"),
    // insurance_expiry_date: Yup.date().required("Required"),
    // puc_expiry_date: Yup.date().required("Required"),
    // goods_permit_no: Yup.string().required("Required"),
    // goods_permit_validity_date: Yup.date().required("Required"),
    // national_permit_no: Yup.string().required("Required"),
    // national_permit_validity_date: Yup.date().required("Required"),
    // hp: Yup.string().required("Required"),
    // hp_financer_name: Yup.string().required("Required"),
    // number_plate: Yup.string().required("Required"),
    // supd: Yup.string().required("Required"),
  });

  const handleSubmit = (values, { setSubmitting }) => {
    handleEditDialogSave(values);
    setSubmitting(false);
  };

  const formik = useFormik({
    initialValues: {
      // truck_no: "",
      inspection_due_date: "",
      mv_tax_date: "",
      insurance_expiry_date: "",
      puc_expiry_date: "",
      goods_permit_no: "",
      goods_permit_validity_date: "",
      national_permit_no: "",
      national_permit_validity_date: "",
      hp: "",
      hp_financer_name: "",
      number_plate: "",
      supd: "",
      // fitness_document_photo: [],
      mv_tax_photo: [],
      insurance_photo: [],
      puc_photo: [],
      goods_permit_photo: [],
      national_permit_photo: [],
      rc_front_photo: [],
      mv_tax_date_checked: false,
      rc_rear_photo: [],
    },
    validationSchema: validationSchema,
    onSubmit: handleSubmit,
  });

  const handleFileUpload = async (event, fieldName) => {
    const files = event.target.files;
    const uploadedFiles = Array.isArray(formik.values[fieldName])
      ? [...formik.values[fieldName]]
      : [];

    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, "rto");
        uploadedFiles.push(result.Location);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    formik.setFieldValue(fieldName, uploadedFiles);
  };

  const handleDeleteImage = (fieldName, index) => {
    const newImages = [...formik.values[fieldName]];
    newImages.splice(index, 1);
    formik.setFieldValue(fieldName, newImages);
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

  const columns = [
    {
      accessorKey: "actions",
      header: "Actions",
      Cell: ({ row }) => (
        <Box>
          <IconButton onClick={() => handleEditVehicle(row.original)}>
            <EditIcon />
          </IconButton>

          <IconButton
            sx={{ color: "#BE3838", cursor: "pointer", fontSize: "18px" }}
            onClick={() => handleDeleteVehicle(row.original)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
    { accessorKey: "truck_no", header: "Truck Number" },
    { accessorKey: "type_of_vehicle", header: "Vehicle Type" },
    { accessorKey: "max_tyres", header: "Max Tyres" },
    { accessorKey: "units", header: "Units" },
    { accessorKey: "inspection_due_date", header: "Inspection Due Date" },
    { accessorKey: "mv_tax_date", header: "MV Tax Date" },
    { accessorKey: "insurance_expiry_date", header: "Insurance Expiry Date" },
    { accessorKey: "puc_expiry_date", header: "PUC Expiry Date" },
    { accessorKey: "goods_permit_no", header: "Goods Permit No" },
    {
      accessorKey: "goods_permit_validity_date",
      header: "Goods Permit Validity Date",
    },
    { accessorKey: "national_permit_no", header: "National Permit No" },
    {
      accessorKey: "national_permit_validity_date",
      header: "National Permit Validity Date",
    },
    { accessorKey: "hp", header: "HP" },
    { accessorKey: "hp_financer_name", header: "HP Financer Name" },
    { accessorKey: "number_plate", header: "Number Plate" },
    { accessorKey: "supd", header: "SUPD" },
    {
      accessorKey: "mv_tax_photo",
      header: "MV Tax Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "insurance_photo",
      header: "Insurance Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "puc_photo",
      header: "PUC Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "goods_permit_photo",
      header: "Goods Permit Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "national_permit_photo",
      header: "National Permit Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "rc_front_photo",
      header: "RC Front Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
    {
      accessorKey: "rc_rear_photo",
      header: "RC Rear Photo",
      Cell: ({ cell }) => {
        const photos = cell.getValue();
        return photos && photos.length > 0 ? (
          <div>
            {photos.map((photo, index) => (
              <a
                key={index}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  marginBottom: "5px",
                  textDecoration: "none",
                  color: "blue",
                }}
              >
                Doc {index + 1}
              </a>
            ))}
          </div>
        ) : null;
      },
    },
  ];

  const renderImagePreview = (fieldName) => {
    const links = formik.values[fieldName] || [];
    const validLinks = links.filter((link) => link && link.trim() !== "");

    if (validLinks.length === 0) return null;

    const handleClickOpen = (index) => {
      setDeleteIndex(index);
      setCurrentField(fieldName);
      setOpenImageDeleteModal(true);
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
            {validLinks.map((link, index) => (
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
                    onClick={() => handleClickOpen(index)}
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
          handleClose={() => setOpenImageDeleteModal(false)}
          handleConfirm={() => {
            handleDeleteImage(currentField, deleteIndex);
            setOpenImageDeleteModal(false);
          }}
          message="Are you sure you want to delete this image from the server as well?"
        />
      </Box>
    );
  };

  const handleEditVehicle = (vehicle) => {
    if (vehicle) {
      const editValues = {
        truck_no: vehicle.truck_no || "",
        type_of_vehicle: vehicle.type_of_vehicle || "",
        max_tyres: vehicle.max_tyres || "",
        units: vehicle.units || "",
        inspection_due_date: vehicle.inspection_due_date || "",
        mv_tax_date: vehicle.mv_tax_date || "",
        insurance_expiry_date: vehicle.insurance_expiry_date || "",
        puc_expiry_date: vehicle.puc_expiry_date || "",
        goods_permit_no: vehicle.goods_permit_no || "",
        goods_permit_validity_date: vehicle.goods_permit_validity_date || "",
        national_permit_no: vehicle.national_permit_no || "",
        national_permit_validity_date:
          vehicle.national_permit_validity_date || "",
        hp: vehicle.hp || "",
        hp_financer_name: vehicle.hp_financer_name || "",
        number_plate: vehicle.number_plate || "",
        supd: vehicle.supd || "",
        mv_tax_photo: vehicle.mv_tax_photo || [],
        insurance_photo: vehicle.insurance_photo || [],
        puc_photo: vehicle.puc_photo || [],
        goods_permit_photo: vehicle.goods_permit_photo || [],
        national_permit_photo: vehicle.national_permit_photo || [],
        rc_front_photo: vehicle.rc_front_photo || [],
        rc_rear_photo: vehicle.rc_rear_photo || [],
      };

      formik.setValues(editValues);
      setOpenEditDialog(true);
    } else {
      console.error("Attempted to edit a null vehicle");
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    setVehicleToDelete(vehicle);
    setOpenDeleteVehicleConfirmDialog(true);
  };

  const handleConfirmDeleteVehicle = () => {
    if (vehicleToDelete) {
      axios
        .delete(`${deleteVehicleAPI}/${vehicleToDelete.truck_no}`)
        .then((response) => {
          if (response.data.success) {
            setVehicles(
              vehicles.filter((v) => v.truck_no !== vehicleToDelete.truck_no)
            );
          }
        })
        .catch((error) => {
          console.error("Failed to delete vehicle:", error);
        });
    }
    setOpenDeleteVehicleConfirmDialog(false);
    setVehicleToDelete(null);
  };

  const handleEditDialogClose = () => {
    setOpenEditDialog(false);
    formik.resetForm();
  };
  const handleMvTaxDateCheckedChange = (event) => {
    formik.setFieldValue("mv_tax_date_checked", event.target.checked);
    formik.setFieldValue("mv_tax_date", event.target.checked ? "LTT" : "");
  };

  const handleEditDialogSave = (values) => {
    const editVehicleAPI = `${apiBaseURL}/vehicles/${values.truck_no}/rto`;

    axios
      .put(editVehicleAPI, values)
      .then((response) => {
        if (response.data) {
          setVehicles(
            vehicles.map((v) => (v.truck_no === values.truck_no ? values : v))
          );
          setOpenEditDialog(false);
        } else {
          console.error("API returned unexpected response", response.data);
        }
      })
      .catch((error) => {
        console.error("Failed to update vehicle:", error.response || error);
      });
  };

  const table = useMaterialReactTable({
    columns,
    data: vehicles,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false,
    initialState: { density: "compact" },
    enableGrouping: true,
    enableColumnFilters: true,
    enableStickyHeader: true,
    muiTableContainerProps: { sx: { maxHeight: "600px" } },
  });

  return (
    <div>
      {/* {vehicles.length === 0 ? (
        <p>No vehicles to display</p>
      ) : (
        <MaterialReactTable table={table} />
      )}
      {error && <Alert severity="error">{error}</Alert>} */}
      <MaterialReactTable table={table} />
      <Dialog open={openEditDialog} onClose={handleEditDialogClose}>
        <DialogTitle>Edit Vehicle</DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Typography
              variant="body1"
              sx={{
                fontSize: "1.1rem",
                fontWeight: "500",
                color: "#0d47a1",
              }}
            >
              Truck Number: {formik.values.truck_no}
            </Typography>
            <Box display="flex" alignItems="center">
              {formik.values.mv_tax_date === "LTT" ? (
                <TextField
                  size="small"
                  margin="dense"
                  variant="filled"
                  fullWidth
                  id="mv_tax_date_readonly"
                  name="mv_tax_date"
                  label="MV Tax Date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.mv_tax_date}
                  InputProps={{
                    readOnly: true,
                  }}
                  style={{
                    marginTop: "16px",
                    marginBottom: "8px",
                    padding: "18.5px 14px",
                    borderRadius: "4px",
                    width: "100%",
                    fontSize: "16px",
                  }}
                />
              ) : (
                <TextField
                  size="small"
                  margin="dense"
                  variant="filled"
                  fullWidth
                  type="date"
                  id="mv_tax_date"
                  name="mv_tax_date"
                  label="MV Tax Date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.mv_tax_date}
                  onChange={formik.handleChange}
                  error={
                    formik.touched.mv_tax_date &&
                    Boolean(formik.errors.mv_tax_date)
                  }
                  helperText={
                    formik.touched.mv_tax_date && formik.errors.mv_tax_date
                  }
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.mv_tax_date === "LTT"}
                    onChange={handleMvTaxDateCheckedChange}
                    name="mv_tax_date_checked"
                    color="primary"
                  />
                }
                label="LTT"
                sx={{ marginLeft: 5, marginRight: 5 }}
              />
            </Box>
            {[
              "inspection_due_date",
              "insurance_expiry_date",
              "puc_expiry_date",
              "goods_permit_validity_date",
              "national_permit_validity_date",
            ].map((field) => (
              <TextField
                key={field}
                margin="dense"
                label={field
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                type="date"
                fullWidth
                name={field}
                value={formik.values[field]}
                onChange={formik.handleChange}
                error={formik.touched[field] && Boolean(formik.errors[field])}
                helperText={formik.touched[field] && formik.errors[field]}
                InputLabelProps={{ shrink: true }}
              />
            ))}

            {[
              "goods_permit_no",
              "national_permit_no",
              "hp",
              "hp_financer_name",
              // "number_plate",
              "supd",
            ].map((field) => (
              <TextField
                key={field}
                margin="dense"
                label={field
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                type="text"
                fullWidth
                name={field}
                value={formik.values[field]}
                onChange={formik.handleChange}
                error={formik.touched[field] && Boolean(formik.errors[field])}
                helperText={formik.touched[field] && formik.errors[field]}
              />
            ))}
            <FormControl fullWidth margin="dense">
              <InputLabel id="number-plate-label">Number Plate</InputLabel>
              <Select
                labelId="number-plate-label"
                id="number_plate"
                name="number_plate"
                value={formik.values.number_plate}
                InputLabelProps={{ shrink: true }}
                onChange={formik.handleChange}
                error={
                  formik.touched.number_plate &&
                  Boolean(formik.errors.number_plate)
                }
              >
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="New Required">New Required</MenuItem>
              </Select>
              {formik.touched.number_plate && formik.errors.number_plate && (
                <FormHelperText error>
                  {formik.errors.number_plate}
                </FormHelperText>
              )}
            </FormControl>
            {[
              // "fitness_document_photo",
              "mv_tax_photo",
              "insurance_photo",
              "puc_photo",
              "goods_permit_photo",
              "national_permit_photo",
              "rc_front_photo",
              "rc_rear_photo",
            ].map((fieldName) => (
              <Box mt={1} key={fieldName}>
                <input
                  accept="image/*"
                  style={{ display: "none" }}
                  id={`file-upload-${fieldName}`}
                  multiple
                  type="file"
                  onChange={(event) => handleFileUpload(event, fieldName)}
                />
                <label htmlFor={`file-upload-${fieldName}`}>
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
                    Upload {fieldName.replace(/_/g, " ")}
                  </Button>
                </label>
                {renderImagePreview(fieldName)}
              </Box>
            ))}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleEditDialogClose}>Cancel</Button>
            <Button type="submit" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={openDeleteVehicleConfirmDialog}
        onClose={() => setOpenDeleteVehicleConfirmDialog(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Vehicle Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this vehicle? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDeleteVehicleConfirmDialog(false)}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteVehicle}
            color="primary"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RtoDetails;
