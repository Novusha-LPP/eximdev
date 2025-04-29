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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Stack,
  Grid,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Formik, Form, FieldArray } from "formik";
import Autocomplete from "@mui/material/Autocomplete";
import * as Yup from "yup";

// ---------------------- Validation Schema ----------------------
const moreAddressSchema = Yup.object().shape({
  type: Yup.string()
    .oneOf(["Delivery", "Factory", "Pickup", "Warehouse"])
    .required("Type is required"),
  name: Yup.string().required("Name is required"),
  address: Yup.string().required("Address is required"),
});

const contactSchema = Yup.object().shape({
  contactName: Yup.string().required("Contact Name is required"),
  titleDesignation: Yup.string().required("Title/Designation is required"),
});

const branchSchema = Yup.object().shape({
  branchName: Yup.string().required("Branch Name is required"),
  address: Yup.string().required("Branch Address is required"),
  addresses: Yup.array().of(moreAddressSchema),
  contacts: Yup.array().of(contactSchema),
});

const organisationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  alias: Yup.string(),
  type: Yup.array()
    .of(
      Yup.string().oneOf([
        "Consignor",
        "Consignee",
        "Services",
        "Agent",
        "Carrier",
        "Global",
      ])
    )
    .min(1, "At least one type is required")
    .required("Type is required"),

  binNo: Yup.string(),
  cinNo: Yup.string(),
  cstNo: Yup.string(),
  stNo: Yup.string(),
  stRegNo: Yup.string(),
  tanNo: Yup.string(),
  vatNo: Yup.string(),
  gstin: Yup.string().required("GSTIN is required"), // Made mandatory
  panNo: Yup.string(),
  ieCodeNo: Yup.string().required("IE Code No. is required"), // Made mandatory
  branches: Yup.array()
    .of(branchSchema)
    .min(1, "At least one branch is required"),
});

// ---------------------- Main Component ----------------------
const Organisation = () => {
  const [orgs, setOrgs] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");

  const [initialValues, setInitialValues] = useState({
    name: "",
    alias: "",
    type: [],
    binNo: "",
    cinNo: "",
    cstNo: "",
    stNo: "",
    stRegNo: "",
    tanNo: "",
    vatNo: "",
    gstin: "",
    panNo: "",
    ieCodeNo: "",
    branches: [
      {
        branchName: "Head Office",
        address: "",
        country: "",
        state: "",
        city: "",
        postalCode: "",
        telephoneNo: "",
        fax: "",
        website: "",
        emailAddress: "",
        taxableType: "Standard",
        addresses: [],
        contacts: [],
      },
    ],
  });

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ---------------------- Fetch Data ----------------------
  const fetchOrganisations = async () => {
    try {
      const res = await axios.get(`${API_URL}/organisations`);
      setOrgs(res.data.data || []);
    } catch (err) {
      console.error("❌ Error fetching Organisations:", err);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  // ---------------------- CRUD Handlers ----------------------
  const handleAdd = () => {
    setModalMode("add");
    setInitialValues({
      name: "",
      alias: "",
      type: [],
      binNo: "",
      cinNo: "",
      cstNo: "",
      stNo: "",
      stRegNo: "",
      tanNo: "",
      vatNo: "",
      gstin: "",
      panNo: "",
      ieCodeNo: "",
      branches: [],
    });
    setOpenModal(true);
  };

  const handleEdit = (org) => {
    setModalMode("edit");
    setInitialValues({
      _id: org._id,
      name: org.name || "",
      alias: org.alias || "",
      type: org.type || [],
      binNo: org.binNo || "",
      cinNo: org.cinNo || "",
      cstNo: org.cstNo || "",
      stNo: org.stNo || "",
      stRegNo: org.stRegNo || "",
      tanNo: org.tanNo || "",
      vatNo: org.vatNo || "",
      gstin: org.gstin || "",
      panNo: org.panNo || "",
      ieCodeNo: org.ieCodeNo || "",
      branches: org.branches
        ? org.branches.map((b) => ({
            branchName: b.branchName || "",
            address: b.address || "",
            country: b.country || "",
            state: b.state || "",
            city: b.city || "",
            postalCode: b.postalCode || "",
            telephoneNo: b.telephoneNo || "",
            fax: b.fax || "",
            website: b.website || "",
            emailAddress: b.emailAddress || "",
            taxableType: b.taxableType || "Standard",
            addresses: b.addresses || [],
            contacts: b.contacts || [],
          }))
        : [],
    });
    setOpenModal(true);
  };

  const handleDelete = async (org) => {
    if (window.confirm(`Delete Organisation: ${org.name}?`)) {
      try {
        await axios.delete(`${API_URL}/organisations/${org._id}`);
        fetchOrganisations();
      } catch (err) {
        console.error("❌ Error deleting Organisation:", err);
      }
    }
  };
  // Utility function to format the name
  const formatName = (name) => {
    return name
      .split(" ")
      .filter((word) => word.trim() !== "") // Remove extra spaces
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // ---------------------- CRUD Handlers ----------------------
  const handleSave = async (values) => {
    const { _id, ...payload } = values;

    // Format the name before saving
    payload.name = formatName(payload.name);

    try {
      let res;
      if (modalMode === "add") {
        res = await axios.post(`${API_URL}/organisations`, payload);
      } else {
        res = await axios.put(`${API_URL}/organisations/${_id}`, payload);
      }
      if (res.status === 200 || res.status === 201) {
        alert(
          `Organisation ${
            modalMode === "add" ? "added" : "updated"
          } successfully!`
        );
        setOpenModal(false);
        fetchOrganisations();
      } else {
        alert(`Failed to save: ${res.statusText}`);
      }
    } catch (err) {
      console.error("❌ Error saving Organisation:", err);
      alert(
        `Failed to save Organisation: ${
          err.response?.data?.error || "Server error"
        }`
      );
    }
  };

  // ---------------------- UI/UX Rendering ----------------------
  return (
    <Box p={2}>
      {/* <Typography variant="h4" mb={3}>
        Organisation Directory
      </Typography> */}

      {/* Add Organisation Button */}
      <Button variant="contained" onClick={handleAdd}>
        Add Organisation
      </Button>

      {/* List of Organisations */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Name</strong>
              </TableCell>
              <TableCell>
                <strong>Alias</strong>
              </TableCell>
              <TableCell>
                <strong>Type</strong>
              </TableCell>
              <TableCell>
                <strong>GSTIN</strong>
              </TableCell>
              <TableCell>
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orgs.map((org) => (
              <TableRow key={org._id}>
                <TableCell>{org.name}</TableCell>
                <TableCell>{org.alias}</TableCell>
                <TableCell>{org.type.join(", ")}</TableCell>
                <TableCell>{org.gstin}</TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleEdit(org)}
                    sx={{ mr: 1 }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(org)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {orgs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No Organisations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal: Add/Edit Organisation */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {modalMode === "add" ? "Add Organisation" : "Edit Organisation"}
        </DialogTitle>

        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={organisationSchema}
            onSubmit={handleSave}
            enableReinitialize
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              setFieldValue,
            }) => (
              <Form>
                {/* Top-level organisation fields */}
                <Stack spacing={3} mt={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Basic Details
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Alias"
                        name="alias"
                        value={values.alias}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.alias && Boolean(errors.alias)}
                        helperText={touched.alias && errors.alias}
                      />
                    </Grid>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <Autocomplete
                        multiple // Enables multiple selection
                        id="type"
                        options={[
                          "Consignor",
                          "Consignee",
                          "Services",
                          "Agent",
                          "Carrier",
                          "Global",
                        ]}
                        value={values.type || []}
                        onChange={(event, newValue) => {
                          setFieldValue("type", newValue); // Updates Formik's state
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Type"
                            name="type"
                            fullWidth
                            error={
                              touched.type &&
                              Boolean(errors.type) &&
                              values.type.length === 0
                            }
                            helperText={touched.type && errors.type}
                          />
                        )}
                      />
                      {touched.type &&
                        Boolean(errors.type) &&
                        values.type.length === 0 && (
                          <Typography color="error" variant="caption">
                            {errors.type}
                          </Typography>
                        )}
                    </FormControl>
                  </Grid>

                  <Typography variant="subtitle1" fontWeight="bold">
                    Registration & Tax IDs
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        label="GSTIN"
                        name="gstin"
                        value={values.gstin}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.gstin && Boolean(errors.gstin)}
                        helperText={touched.gstin && errors.gstin}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="BIN No."
                        name="binNo"
                        value={values.binNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CIN No."
                        name="cinNo"
                        value={values.cinNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CST No."
                        name="cstNo"
                        value={values.cstNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="ST No."
                        name="stNo"
                        value={values.stNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="ST Reg No."
                        name="stRegNo"
                        value={values.stRegNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="TAN No."
                        name="tanNo"
                        value={values.tanNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="VAT No."
                        name="vatNo"
                        value={values.vatNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="PAN No."
                        name="panNo"
                        value={values.panNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        required
                        fullWidth
                        label="IE Code No."
                        name="ieCodeNo"
                        value={values.ieCodeNo}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.ieCodeNo && Boolean(errors.ieCodeNo)}
                        helperText={touched.ieCodeNo && errors.ieCodeNo}
                      />
                    </Grid>
                  </Grid>

                  {/* Branches Array */}
                  <FieldArray name="branches">
                    {({ push, remove }) => (
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          sx={{ mt: 3 }}
                        >
                          Branch Details{" "}
                          {values.branches.length === 0 &&
                            "(At least one branch is required)"}
                        </Typography>

                        {values.branches &&
                          values.branches.length > 0 &&
                          values.branches.map((branch, i) => (
                            <Paper
                              key={i}
                              variant="outlined"
                              sx={{ p: 2, mb: 2, borderColor: "#bbb" }}
                            >
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={1}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                >
                                  Branch #{i + 1}
                                </Typography>
                                <Button color="error" onClick={() => remove(i)}>
                                  Remove Branch
                                </Button>
                              </Box>

                              {/* Branch Fields */}
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Branch Name"
                                    name={`branches.${i}.branchName`}
                                    value={branch.branchName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    required
                                    error={
                                      touched.branches &&
                                      touched.branches[i]?.branchName &&
                                      Boolean(errors.branches?.[i]?.branchName)
                                    }
                                    helperText={
                                      touched.branches &&
                                      touched.branches[i]?.branchName &&
                                      errors.branches?.[i]?.branchName
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Address"
                                    name={`branches.${i}.address`}
                                    value={branch.address}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    required
                                    error={
                                      touched.branches &&
                                      touched.branches[i]?.address &&
                                      Boolean(errors.branches?.[i]?.address)
                                    }
                                    helperText={
                                      touched.branches &&
                                      touched.branches[i]?.address &&
                                      errors.branches?.[i]?.address
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Country"
                                    name={`branches.${i}.country`}
                                    value={branch.country}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="State"
                                    name={`branches.${i}.state`}
                                    value={branch.state}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="City"
                                    name={`branches.${i}.city`}
                                    value={branch.city}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Postal Code"
                                    name={`branches.${i}.postalCode`}
                                    value={branch.postalCode}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    required
                                    fullWidth
                                    label="Telephone No."
                                    name={`branches.${i}.telephoneNo`}
                                    value={branch.telephoneNo}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Fax"
                                    name={`branches.${i}.fax`}
                                    value={branch.fax}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Website"
                                    name={`branches.${i}.website`}
                                    value={branch.website}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    fullWidth
                                    label="Email Address"
                                    name={`branches.${i}.emailAddress`}
                                    value={branch.emailAddress}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <FormControl fullWidth>
                                    <InputLabel>Taxable Type</InputLabel>
                                    <Select
                                      name={`branches.${i}.taxableType`}
                                      label="Taxable Type"
                                      value={branch.taxableType}
                                      onChange={handleChange}
                                      onBlur={handleBlur}
                                    >
                                      {[
                                        "Standard",
                                        "SEZ",
                                        "Exempt",
                                        "Composite supplier",
                                      ].map((opt) => (
                                        <MenuItem key={opt} value={opt}>
                                          {opt}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                              </Grid>

                              {/* More Addresses */}
                              <FieldArray name={`branches.${i}.addresses`}>
                                {({ push: pushAddr, remove: removeAddr }) => (
                                  <Box mt={3}>
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight="bold"
                                      mb={1}
                                    >
                                      More Addresses
                                    </Typography>

                                    {branch.addresses &&
                                      branch.addresses.length > 0 &&
                                      branch.addresses.map((addr, j) => (
                                        <Paper
                                          key={j}
                                          variant="outlined"
                                          sx={{
                                            p: 2,
                                            mb: 2,
                                            borderColor: "#ccc",
                                          }}
                                        >
                                          <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                          >
                                            <Typography
                                              variant="body1"
                                              fontWeight="bold"
                                            >
                                              Address #{j + 1}
                                            </Typography>
                                            <Button
                                              variant="text"
                                              color="error"
                                              onClick={() => removeAddr(j)}
                                            >
                                              Remove
                                            </Button>
                                          </Box>
                                          <Grid container spacing={2} mt={1}>
                                            <Grid item xs={12} md={6}>
                                              <FormControl fullWidth>
                                                <InputLabel>Type</InputLabel>
                                                <Select
                                                  name={`branches.${i}.addresses.${j}.type`}
                                                  label="Type"
                                                  value={addr.type}
                                                  onChange={handleChange}
                                                  onBlur={handleBlur}
                                                >
                                                  {[
                                                    "Delivery",
                                                    "Factory",
                                                    "Pickup",
                                                    "Warehouse",
                                                  ].map((t) => (
                                                    <MenuItem key={t} value={t}>
                                                      {t}
                                                    </MenuItem>
                                                  ))}
                                                </Select>
                                              </FormControl>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Name"
                                                name={`branches.${i}.addresses.${j}.name`}
                                                value={addr.name}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={12}>
                                              <TextField
                                                fullWidth
                                                label="Address"
                                                name={`branches.${i}.addresses.${j}.address`}
                                                value={addr.address}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="City"
                                                name={`branches.${i}.addresses.${j}.city`}
                                                value={addr.city}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Postal Code"
                                                name={`branches.${i}.addresses.${j}.postalCode`}
                                                value={addr.postalCode}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="State"
                                                name={`branches.${i}.addresses.${j}.state`}
                                                value={addr.state}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Telephone"
                                                name={`branches.${i}.addresses.${j}.telephone`}
                                                value={addr.telephone}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Fax"
                                                name={`branches.${i}.addresses.${j}.fax`}
                                                value={addr.fax}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Email Address"
                                                name={`branches.${i}.addresses.${j}.emailAddress`}
                                                value={addr.emailAddress}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                          </Grid>
                                        </Paper>
                                      ))}
                                    <Button
                                      variant="outlined"
                                      sx={{ mb: 2 }}
                                      onClick={() =>
                                        pushAddr({
                                          type: "Delivery",
                                          name: "",
                                          address: "",
                                          city: "",
                                          postalCode: "",
                                          state: "",
                                          telephone: "",
                                          fax: "",
                                          emailAddress: "",
                                        })
                                      }
                                    >
                                      + Add Address
                                    </Button>
                                  </Box>
                                )}
                              </FieldArray>

                              {/* Contacts */}
                              <FieldArray name={`branches.${i}.contacts`}>
                                {({
                                  push: pushContact,
                                  remove: removeContact,
                                }) => (
                                  <Box mt={3}>
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight="bold"
                                      mb={1}
                                    >
                                      Contacts
                                    </Typography>

                                    {branch.contacts &&
                                      branch.contacts.length > 0 &&
                                      branch.contacts.map((c, k) => (
                                        <Paper
                                          key={k}
                                          variant="outlined"
                                          sx={{
                                            p: 2,
                                            mb: 2,
                                            borderColor: "#ccc",
                                          }}
                                        >
                                          <Box
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                          >
                                            <Typography
                                              variant="body1"
                                              fontWeight="bold"
                                            >
                                              Contact #{k + 1}
                                            </Typography>
                                            <Button
                                              variant="text"
                                              color="error"
                                              onClick={() => removeContact(k)}
                                            >
                                              Remove
                                            </Button>
                                          </Box>
                                          <Grid container spacing={2} mt={1}>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Contact Name"
                                                name={`branches.${i}.contacts.${k}.contactName`}
                                                value={c.contactName}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Title / Designation"
                                                name={`branches.${i}.contacts.${k}.titleDesignation`}
                                                value={c.titleDesignation}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Department"
                                                name={`branches.${i}.contacts.${k}.department`}
                                                value={c.department}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Telephone"
                                                name={`branches.${i}.contacts.${k}.telephone`}
                                                value={c.telephone}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Mobile"
                                                name={`branches.${i}.contacts.${k}.mobile`}
                                                value={c.mobile}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                              <TextField
                                                fullWidth
                                                label="Email Address"
                                                name={`branches.${i}.contacts.${k}.emailAddress`}
                                                value={c.emailAddress}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                              />
                                            </Grid>
                                          </Grid>
                                        </Paper>
                                      ))}
                                    <Button
                                      variant="outlined"
                                      sx={{ mb: 2 }}
                                      onClick={() =>
                                        pushContact({
                                          contactName: "",
                                          titleDesignation: "",
                                          department: "",
                                          telephone: "",
                                          mobile: "",
                                          emailAddress: "",
                                        })
                                      }
                                    >
                                      + Add Contact
                                    </Button>
                                  </Box>
                                )}
                              </FieldArray>
                            </Paper>
                          ))}
                        <Button
                          variant="outlined"
                          sx={{ my: 1 }}
                          onClick={() =>
                            push({
                              branchName: "",
                              address: "",
                              country: "",
                              state: "",
                              city: "",
                              postalCode: "",
                              telephoneNo: "",
                              fax: "",
                              website: "",
                              emailAddress: "",
                              taxableType: "Standard",
                              addresses: [],
                              contacts: [],
                            })
                          }
                        >
                          + Add Branch
                        </Button>
                      </Box>
                    )}
                  </FieldArray>
                </Stack>

                {/* Actions at bottom */}
                <DialogActions sx={{ mt: 2 }}>
                  <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                  <Button variant="contained" type="submit">
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

export default Organisation;
