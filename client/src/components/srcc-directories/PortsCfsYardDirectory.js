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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import Autocomplete from "@mui/material/Autocomplete";

const validationSchema = Yup.object({
  organisation: Yup.object({
    _id: Yup.string().required("Organisation ID is required"),
    name: Yup.string().required("Organisation name is required"),
  }).required("Organisation is required"),
  name: Yup.string().required("Port Name is required"),
  icd_code: Yup.string()
    .required("ICD Code is required")
    .matches(/^\S*$/, "ICD Code must not contain spaces"),
  state: Yup.string().required("State is required"),
  country: Yup.string().required("Country is required"),
  active: Yup.boolean().required("Active status is required"),
  type: Yup.string().required("Port Type is required"),
});

function PortsCfsYardDirectory() {
  const [portsData, setPortsData] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [orgOptions, setOrgOptions] = useState([]);
  const [formData, setFormData] = useState({
    organisation: { _id: "", name: "" },
    name: "",
    icd_code: "",
    state: "",
    country: "",
    active: true,
    type: "",
    contactPersonName: "",
    contactPersonEmail: "",
    contactPersonPhone: "",
    isBranch: false,
    prefix: "",
    suffix: "",
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";
  const [existingPorts, setExistingPorts] = useState([]);
  const fetchPorts = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-port-types`);
      const portsList = response.data.data || [];
      setPortsData(portsList);
      setExistingPorts(portsList.map((port) => port.icd_code.toLowerCase()));
    } catch (error) {
      console.error("❌ Error fetching ports:", error);
    }
  };

  useEffect(() => {
    fetchPorts();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setFormData({
      organisation: { _id: "", name: "" },
      name: "",
      icd_code: "",
      state: "",
      country: "",
      active: true,
      type: "",
      contactPersonName: "",
      contactPersonEmail: "",
      contactPersonPhone: "",
      isBranch: false,
      prefix: "",
      suffix: "",
    });
    setOpenModal(true);
  };

  const handleEdit = (port) => {
    setModalMode("edit");
    setFormData({
      ...port,
      active: port.active === true,
    });
    setOpenModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Port/CFS/Yard?")) {
      try {
        await axios.delete(`${API_URL}/delete-port-type/${id}`);
        fetchPorts(); // Refresh the list
      } catch (error) {
        console.error("Error deleting port:", error);
      }
    }
  };

  const handleSave = async (values) => {
    try {
      if (modalMode === "add") {
        await axios.post(`${API_URL}/add-port-type`, values);
      } else {
        await axios.put(`${API_URL}/update-port-type/${values._id}`, values);
      }
      setOpenModal(false);
      fetchPorts(); // Refresh the list
    } catch (error) {
      alert(
        "Error: Port with this ICD code already exists. Please use a different code."
      );
      console.error("Error saving port:", error);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleAdd}>
          Add Port
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>State</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Contact Email</TableCell>
              <TableCell>Contact Phone</TableCell>
              <TableCell>Is Branch</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {portsData.map((port) => (
              <TableRow key={port._id}>
                <TableCell>{port.name}</TableCell>
                <TableCell>{port.icd_code}</TableCell>
                <TableCell>{port.state}</TableCell>
                <TableCell>{port.country}</TableCell>
                <TableCell>{port.active ? "Yes" : "No"}</TableCell>
                <TableCell>{port.type}</TableCell>
                <TableCell>{port.contactPersonName}</TableCell>
                <TableCell>{port.contactPersonEmail}</TableCell>
                <TableCell>{port.contactPersonPhone}</TableCell>
                <TableCell>{port.isBranch ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(port)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(port._id)}
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

      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add New Port" : "Edit Port"}
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={formData}
            validationSchema={validationSchema}
            onSubmit={handleSave}
            enableReinitialize
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Autocomplete
                    options={orgOptions}
                    getOptionLabel={(option) => option.name || ""}
                    filterOptions={(x) => x}
                    onInputChange={async (e, value) => {
                      if (value.length < 2) return;
                      try {
                        const res = await axios.get(
                          `${API_URL}/organisations/autocomplete?q=${value}`
                        );
                        setOrgOptions(res.data.data || []);
                      } catch (err) {
                        console.error("❌ Error searching organizations:", err);
                      }
                    }}
                    onChange={(event, newValue) => {
                      setFieldValue(
                        "organisation",
                        newValue || { _id: "", name: "" }
                      );
                    }}
                    value={values.organisation || null}
                    isOptionEqualToValue={(option, value) =>
                      option._id === value._id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Organisation"
                        name="organisation"
                        fullWidth
                        onBlur={handleBlur}
                        error={
                          touched.organisation && Boolean(errors.organisation)
                        }
                        helperText={
                          touched.organisation && errors.organisation?.name
                        }
                      />
                    )}
                  />

                  <TextField
                    name="name"
                    label="Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />

                  <TextField
                    name="icd_code"
                    label="Code"
                    value={values.icd_code}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.icd_code && Boolean(errors.icd_code)}
                    helperText={touched.icd_code && errors.icd_code}
                  />

                  <TextField
                    name="state"
                    label="State"
                    value={values.state}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.state && Boolean(errors.state)}
                    helperText={touched.state && errors.state}
                  />

                  <TextField
                    name="country"
                    label="Country"
                    value={values.country}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                    required
                    error={touched.country && Boolean(errors.country)}
                    helperText={touched.country && errors.country}
                  />

                  <Box display="flex" alignItems="center" gap={4}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Active</FormLabel>
                      <RadioGroup
                        row
                        name="active"
                        value={values.active}
                        onChange={handleChange}
                      >
                        <FormControlLabel
                          value={true}
                          control={<Radio sx={{ color: "green" }} />}
                          label="Active"
                        />
                        <FormControlLabel
                          value={false}
                          control={<Radio />}
                          label="Inactive"
                        />
                      </RadioGroup>
                    </FormControl>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Is Branch</FormLabel>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="isBranch"
                            checked={values.isBranch}
                            onChange={handleChange}
                          />
                        }
                        label="Is Branch"
                      />
                    </FormControl>
                    {values.isBranch && (
                      <Box display="flex" gap={2}>
                        <TextField
                          name="prefix"
                          label="Prefix eg(KHD)"
                          value={values.prefix}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          fullWidth
                        />
                        <TextField
                          name="suffix"
                          label="Suffix eg(25-26)"
                          value={values.suffix}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          fullWidth
                        />
                      </Box>
                    )}
                  </Box>

                  <FormControl fullWidth>
                    <Autocomplete
                      id="port-type"
                      options={[
                        "Air custodian",
                        "CFS",
                        "Ports",
                        "Empty yard",
                        "ICD",
                        "Terminal",
                      ]}
                      value={values.type || null}
                      onChange={(event, newValue) => {
                        setFieldValue("type", newValue);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Port Type"
                          name="type"
                          required
                          fullWidth
                        />
                      )}
                    />
                  </FormControl>

                  <TextField
                    name="contactPersonName"
                    label="Contact Person Name"
                    value={values.contactPersonName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                  />

                  <TextField
                    name="contactPersonEmail"
                    label="Contact Person Email"
                    value={values.contactPersonEmail}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                  />

                  <TextField
                    name="contactPersonPhone"
                    label="Contact Person Phone"
                    value={values.contactPersonPhone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    fullWidth
                  />

                  <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                    <Button variant="contained" type="submit">
                      {modalMode === "add" ? "Add" : "Save"}
                    </Button>
                  </DialogActions>
                </Box>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default PortsCfsYardDirectory;
