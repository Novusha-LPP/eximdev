import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";

// Updated validation schema with nested objects
const validationSchema = Yup.object({
  container_type: Yup.string().required("Container Type is required"),
  iso_code: Yup.string().required("ISO Code is required"),
  teu: Yup.number()
    .min(1, "TEU must be at least 1")
    .required("TEU is required"),
  outer_dimension: Yup.object({
    length: Yup.number()
      .min(0, "Length cannot be negative")
      .required("Length is required"),
    breadth: Yup.number()
      .min(0, "Breadth cannot be negative")
      .required("Breadth is required"),
    height: Yup.number()
      .min(0, "Height cannot be negative")
      .required("Height is required"),
    unit: Yup.string().required("Length unit is required"),
  }),
  cubic_capacity: Yup.object({
    capacity: Yup.number()
      .min(0, "Volume capacity cannot be negative")
      .required("Volume capacity is required"),
    unit: Yup.string().required("Volume unit is required"),
  }),
  tare_weight: Yup.object({
    value: Yup.number()
      .min(0, "Tare weight cannot be negative")
      .required("Tare Weight is required"),
    unit: Yup.string().required("Tare weight unit is required"),
  }),
  payload: Yup.object({
    value: Yup.number()
      .min(0, "Payload cannot be negative")
      .required("Payload is required"),
    unit: Yup.string().required("Payload unit is required"),
  }),
  is_temp_controlled: Yup.boolean(),
  is_tank_container: Yup.boolean(),
  size: Yup.string().required("Size is required"),
});

const ContainerTypeDirectory = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editData, setEditData] = useState({
    container_type: "",
    iso_code: "",
    teu: "",
    outer_dimension: { length: "", breadth: "", height: "", unit: "" },
    cubic_capacity: { capacity: "", unit: "" },
    tare_weight: { value: "", unit: "" },
    payload: { value: "", unit: "" },
    is_temp_controlled: false,
    is_tank_container: false,
    size: "",
  });

  const [unitMeasurements, setUnitMeasurements] = useState([]);
  const [lengthUnits, setLengthUnits] = useState([]);
  const [volumeUnits, setVolumeUnits] = useState([]);
  const [weightUnits, setWeightUnits] = useState([]);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // Fetch container types
  const fetchContainerTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-container-types`);
      setContainerTypes(response.data || []);
    } catch (error) {
      console.error("Error fetching container types:", error);
    }
  };

  // Fetch unit measurements for different categories
  const fetchUnitMeasurements = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-unit-measurements`);
      setUnitMeasurements(response.data);
      const lengthCategory = response.data.find(
        (item) => item.name === "Lengths"
      );
      if (lengthCategory) setLengthUnits(lengthCategory.measurements);
      const volumeCategory = response.data.find(
        (item) => item.name === "Volumes"
      );
      if (volumeCategory) setVolumeUnits(volumeCategory.measurements);
      const weightCategory = response.data.find(
        (item) => item.name === "Weight"
      );
      if (weightCategory) setWeightUnits(weightCategory.measurements);
    } catch (error) {
      console.error("Error fetching unit measurements:", error);
    }
  };

  useEffect(() => {
    fetchContainerTypes();
    fetchUnitMeasurements();
  }, []);

  // Open modal for add/edit; for edit, populate nested objects if available.
  const handleOpenModal = (mode, data = {}) => {
    setModalMode(mode);
    setEditData({
      _id: data._id,
      container_type: data.container_type || "",
      iso_code: data.iso_code || "",
      teu: data.teu || "",
      outer_dimension: data.outer_dimension || {
        length: "",
        breadth: "",
        height: "",
        unit: "",
      },
      cubic_capacity: data.cubic_capacity || { capacity: "", unit: "" },
      tare_weight: data.tare_weight || { value: "", unit: "" },
      payload: data.payload || { value: "", unit: "" },
      is_temp_controlled: data.is_temp_controlled || false,
      is_tank_container: data.is_tank_container || false,
      size: data.size || "",
    });
    setOpenModal(true);
  };

  const handleFormSubmit = async (values) => {
    const url =
      modalMode === "add"
        ? `${API_URL}/add-container-type`
        : `${API_URL}/update-container-type/${values._id}`;
    try {
      await axios[modalMode === "add" ? "post" : "put"](url, values);
      fetchContainerTypes(); // Refresh list after save
      setOpenModal(false);
    } catch (error) {
      if (
        error.response &&
        error.response.data?.error ===
          "Container type with this ISO code already exists"
      ) {
        alert("Error: Container type with this ISO code already exists.");
      } else {
        console.error("Error saving container type:", error);
      }
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this container type?")
    ) {
      await axios.delete(`${API_URL}/delete-container-type/${id}`);
      fetchContainerTypes(); // Refresh list after deletion
    }
  };

  return (
    <Box>
      <Button variant="contained" onClick={() => handleOpenModal("add")}>
        Add Container Type
      </Button>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Container Type</TableCell>
              <TableCell>ISO Code</TableCell>
              <TableCell>TEU</TableCell>
              <TableCell>Outer Dimension</TableCell>
              <TableCell>Volume</TableCell>
              <TableCell>Tare Weight</TableCell>
              <TableCell>Payload</TableCell>
              <TableCell>Temp Controlled</TableCell>
              <TableCell>Tank Container</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {containerTypes.map((container) => (
              <TableRow key={container._id}>
                <TableCell>{container.container_type}</TableCell>
                <TableCell>{container.iso_code}</TableCell>
                <TableCell>{container.teu}</TableCell>
                <TableCell>
                  {container.outer_dimension?.length} x{" "}
                  {container.outer_dimension?.breadth} x{" "}
                  {container.outer_dimension?.height}{" "}
                  {container.outer_dimension?.unit}
                </TableCell>
                <TableCell>
                  {container.cubic_capacity?.capacity}{" "}
                  {container.cubic_capacity?.unit}
                </TableCell>
                <TableCell>
                  {container.tare_weight?.value} {container.tare_weight?.unit}
                </TableCell>
                <TableCell>
                  {container.payload?.value} {container.payload?.unit}
                </TableCell>
                <TableCell>
                  {container.is_temp_controlled ? "Yes" : "No"}
                </TableCell>
                <TableCell>
                  {container.is_tank_container ? "Yes" : "No"}
                </TableCell>
                <TableCell>{container.size}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenModal("edit", container)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(container._id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Formik Modal for Add/Edit Container Types */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add"
            ? "Add New Container Type"
            : "Edit Container Type"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={editData}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={handleFormSubmit}
          >
            {({
              values,
              handleChange,
              handleBlur,
              errors,
              touched,
              setFieldValue,
            }) => (
              <Form>
                <TextField
                  name="container_type"
                  label="Container Type"
                  fullWidth
                  margin="normal"
                  value={values.container_type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={
                    touched.container_type && Boolean(errors.container_type)
                  }
                  helperText={touched.container_type && errors.container_type}
                />
                <TextField
                  name="iso_code"
                  label="ISO Code"
                  fullWidth
                  margin="normal"
                  value={values.iso_code}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.iso_code && Boolean(errors.iso_code)}
                  helperText={touched.iso_code && errors.iso_code}
                />
                <TextField
                  name="teu"
                  label="TEU"
                  fullWidth
                  margin="normal"
                  type="number"
                  value={values.teu}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.teu && Boolean(errors.teu)}
                  helperText={touched.teu && errors.teu}
                />

                {/* Outer Dimension Fields */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <strong>Outer Dimension (Length x Breadth x Height)</strong>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <TextField
                      name="outer_dimension.length"
                      label="Length (L)"
                      type="number"
                      fullWidth
                      value={values.outer_dimension.length}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.outer_dimension?.length &&
                        Boolean(errors.outer_dimension?.length)
                      }
                      helperText={
                        touched.outer_dimension?.length &&
                        errors.outer_dimension?.length
                      }
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      name="outer_dimension.breadth"
                      label="Breadth (B)"
                      type="number"
                      fullWidth
                      value={values.outer_dimension.breadth}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.outer_dimension?.breadth &&
                        Boolean(errors.outer_dimension?.breadth)
                      }
                      helperText={
                        touched.outer_dimension?.breadth &&
                        errors.outer_dimension?.breadth
                      }
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      name="outer_dimension.height"
                      label="Height (H)"
                      type="number"
                      fullWidth
                      value={values.outer_dimension.height}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.outer_dimension?.height &&
                        Boolean(errors.outer_dimension?.height)
                      }
                      helperText={
                        touched.outer_dimension?.height &&
                        errors.outer_dimension?.height
                      }
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <FormControl
                      fullWidth
                      error={
                        touched.outer_dimension?.unit &&
                        Boolean(errors.outer_dimension?.unit)
                      }
                    >
                      <InputLabel>Unit</InputLabel>
                      <Select
                        name="outer_dimension.unit"
                        value={values.outer_dimension.unit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Unit"
                      >
                        {lengthUnits.map((u) => (
                          <MenuItem key={u._id} value={u.symbol}>
                            {u.unit} ({u.symbol})
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.outer_dimension?.unit &&
                        errors.outer_dimension?.unit && (
                          <Box
                            sx={{ color: "red", fontSize: "0.75rem", ml: 2 }}
                          >
                            {errors.outer_dimension.unit}
                          </Box>
                        )}
                    </FormControl>
                  </Grid>
                </Grid>

                {/*  */}
                {/*  */}

                {/*  */}
                {/*  */}

                {/* Cubic Capacity (Volume) Fields */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <strong>Volume (Cubic Capacity)</strong>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      name="cubic_capacity.capacity"
                      label="Capacity"
                      fullWidth
                      margin="normal"
                      type="number"
                      value={values.cubic_capacity.capacity}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.cubic_capacity?.capacity &&
                        Boolean(errors.cubic_capacity?.capacity)
                      }
                      helperText={
                        touched.cubic_capacity?.capacity &&
                        errors.cubic_capacity?.capacity
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={
                        touched.cubic_capacity?.unit &&
                        Boolean(errors.cubic_capacity?.unit)
                      }
                    >
                      <InputLabel>Volume Unit</InputLabel>
                      <Select
                        name="cubic_capacity.unit"
                        value={values.cubic_capacity.unit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Volume Unit"
                      >
                        {volumeUnits.map((u) => (
                          <MenuItem key={u._id} value={u.symbol}>
                            {u.unit} ({u.symbol})
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.cubic_capacity?.unit &&
                        errors.cubic_capacity?.unit && (
                          <Box
                            sx={{ color: "red", fontSize: "0.75rem", ml: 2 }}
                          >
                            {errors.cubic_capacity.unit}
                          </Box>
                        )}
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Tare Weight Fields */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <strong>Tare Weight</strong>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      name="tare_weight.value"
                      label="Tare Weight"
                      fullWidth
                      margin="normal"
                      type="number"
                      value={values.tare_weight.value}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.tare_weight?.value &&
                        Boolean(errors.tare_weight?.value)
                      }
                      helperText={
                        touched.tare_weight?.value && errors.tare_weight?.value
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={
                        touched.tare_weight?.unit &&
                        Boolean(errors.tare_weight?.unit)
                      }
                    >
                      <InputLabel>Tare Weight Unit</InputLabel>
                      <Select
                        name="tare_weight.unit"
                        value={values.tare_weight.unit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Tare Weight Unit"
                      >
                        {weightUnits.map((u) => (
                          <MenuItem key={u._id} value={u.symbol}>
                            {u.unit} ({u.symbol})
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.tare_weight?.unit &&
                        errors.tare_weight?.unit && (
                          <Box
                            sx={{ color: "red", fontSize: "0.75rem", ml: 2 }}
                          >
                            {errors.tare_weight.unit}
                          </Box>
                        )}
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Payload Fields */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <strong>Payload</strong>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      name="payload.value"
                      label="Payload"
                      fullWidth
                      margin="normal"
                      type="number"
                      value={values.payload.value}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={
                        touched.payload?.value && Boolean(errors.payload?.value)
                      }
                      helperText={
                        touched.payload?.value && errors.payload?.value
                      }
                    />
                  </Grid>
                  <Grid item xs={6}>
                    {" "}
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={
                        touched.payload?.unit && Boolean(errors.payload?.unit)
                      }
                    >
                      <InputLabel>Payload Unit</InputLabel>
                      <Select
                        name="payload.unit"
                        value={values.payload.unit}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Payload Unit"
                      >
                        {weightUnits.map((u) => (
                          <MenuItem key={u._id} value={u.symbol}>
                            {u.unit} ({u.symbol})
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.payload?.unit && errors.payload?.unit && (
                        <Box sx={{ color: "red", fontSize: "0.75rem", ml: 2 }}>
                          {errors.payload.unit}
                        </Box>
                      )}
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Boolean fields for temperature control and tank container */}
                <FormControlLabel
                  control={
                    <Checkbox
                      name="is_temp_controlled"
                      checked={values.is_temp_controlled}
                      onChange={handleChange}
                    />
                  }
                  label="Temperature Controlled"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="is_tank_container"
                      checked={values.is_tank_container}
                      onChange={handleChange}
                    />
                  }
                  label="Tank Container"
                />

                {/* Size field (enum) */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Size</InputLabel>
                  <Select
                    name="size"
                    value={values.size}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    label="Size"
                  >
                    {["10", "20", "40", "45"].map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.size && errors.size && (
                    <Box sx={{ color: "red", fontSize: "0.75rem", ml: 2 }}>
                      {errors.size}
                    </Box>
                  )}
                </FormControl>

                <DialogActions>
                  <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                  <Button type="submit" variant="contained">
                    {modalMode === "add" ? "Add" : "Save"}
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ContainerTypeDirectory;
