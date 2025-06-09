import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const validationSchema = Yup.object({
  FAssetID: Yup.string()
    .required("Elock Number is required")
    .matches(/^\d+$/, "Only numbers allowed"),
});

const Elock = () => {
  const [elocks, setElocks] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [selected, setSelected] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_STRING || "http://localhost:9000/api";

  // ✅ Fetch once when component loads
  useEffect(() => {
    fetchElocks();
  }, []);

  const fetchElocks = async () => {
    try {
      const res = await axios.get(`${API_URL}/elock/get-elocks`);
      setElocks(res.data.data || []);
    } catch (err) {
      console.error("Error fetching Elocks:", err);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (mode === "add") {
        await axios.post(`${API_URL}/elock/create-elock`, values);
        alert("Elock added!");
      } else {
        await axios.put(
          `${API_URL}/elock/update-elock/${selected._id}`,
          values
        );
        alert("Elock updated!");
      }
      setOpen(false);
      fetchElocks();
    } catch (err) {
      alert("Failed to save Elock");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Elock?")) {
      try {
        await axios.delete(`${API_URL}/elock/delete-elock/${id}`);
        fetchElocks();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  const handleEdit = (elock) => {
    setSelected(elock);
    setMode("edit");
    setOpen(true);
  };

  const handleAdd = () => {
    setSelected(null);
    setMode("add");
    setOpen(true);
  };

  return (
    <Box>
      <Button variant="contained" onClick={handleAdd} sx={{ mb: 2 }}>
        Add Elock
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Elock Number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {elocks.map((elock) => (
              <TableRow key={elock._id}>
                <TableCell>{elock.FAssetID}</TableCell>
                <TableCell>{elock.status}</TableCell>{" "}
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEdit(elock)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    disabled={elock.status === "ASSIGNED"}
                    onClick={() => handleDelete(elock._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{mode === "add" ? "Add Elock" : "Edit Elock"}</DialogTitle>
        <DialogContent>
          <Formik
            initialValues={{
              FAssetID: selected?.FAssetID || "",
              status: selected?.status || "",
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, handleChange, handleBlur, errors, touched }) => (
              <Form>
                <TextField
                  name="FAssetID"
                  label="Elock Number"
                  value={values.FAssetID}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                  margin="normal"
                  error={touched.FAssetID && Boolean(errors.FAssetID)}
                  helperText={touched.FAssetID && errors.FAssetID}
                />
                <TextField
                  select
                  name="status"
                  label="Status"
                  value={values.status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  fullWidth
                  margin="normal"
                >
                  {["AVAILABLE", "MAINTENANCE", "LOST"].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>

                <DialogActions>
                  <Button onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="contained">
                    {mode === "add" ? "Add" : "Save"}
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

export default Elock;
