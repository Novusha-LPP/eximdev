import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
  InputAdornment
} from "@mui/material";


import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";

import { useModuleAuditLogs } from "./AuditLogs";
import SearchIcon from "@mui/icons-material/Search";
// import { AuditLogProvider } from "../../contexts/AuditLogContext.js";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";



const VENDOR_TYPES = [
  "Transporter",
  "CHA",
  "Shipping Line",
  "Supplier",
  "Service Provider",
  "Other"
];


const EMPTY_FORM = {
  name: "",
  gst_number: "",
  pan_number: "",
  contact_person: "",
  mobile_number: "",
  email: "",
  status: "Active"
};



export default function VendorManagement() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(15);

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(term) ||
      (item.gst_number || "").toLowerCase().includes(term) ||
      (item.pan_number || "").toLowerCase().includes(term) ||
      (item.contact_person || "").toLowerCase().includes(term) ||
      (item.mobile_number || "").toLowerCase().includes(term) ||
      (item.email || "").toLowerCase().includes(term)
    );
  });


  // AUDIT

  const { logCreate, logRead, logUpdate, logDelete } = useModuleAuditLogs("Vendor");



  const fetchData = async () => {

    setLoading(true);

    try {

      const res =
        await itHelpdeskAPI.vendors.getAll();


      const vendors = res.data || res;


      setData(
        Array.isArray(vendors)
          ? vendors
          : []
      );



    } catch (err) {


      logCreate(
        err.message,
        "Vendor fetch failed"
      );


      setData([]);


    }
    finally {

      setLoading(false);

    }

  };




  useEffect(() => {


    fetchData();


    // logRead(
    //   "User opened Vendor Management"
    // );


  }, []);






  const handleOpen = (record = null) => {


    if (record) {


      setEditId(record._id);


      setForm({
        name: record.name || "",
        gst_number: record.gst_number || "",
        pan_number: record.pan_number || "",
        contact_person: record.contact_person || "",
        mobile_number: record.mobile_number || "",
        email: record.email || "",
        status: record.status || "Active"
      });


      // logRead(
      //   `Opened vendor ${record.name}`,
      //   record._id
      // );



    } else {


      setEditId(null);

      setForm({ ...EMPTY_FORM });


      logRead(
        "vendor-creation-intent",
        "Opened vendor creation form",
        "info"
      );


    }


    setShowModal(true);

  };







  const handleSave = async () => {


    if (
      !form.name.trim() ||
      !form.contact_person.trim() ||
      !form.mobile_number.trim() ||
      !form.email.trim()
    ) {
      alert("Please fill required fields");
      return;
    }



    setSaving(true);



    try {


      const payload = {
        name: form.name.trim(),
        gst_number: form.gst_number?.trim() || "",
        pan_number: form.pan_number?.trim() || "",
        contact_person: form.contact_person.trim(),
        mobile_number: form.mobile_number.trim(),
        email: form.email.trim(),
        status: form.status || "Active"
      };





      if (editId) {
        await itHelpdeskAPI.vendors.update(
          editId,
          payload
        );
        alert("Vendor updated successfully");
      } else {
        await itHelpdeskAPI.vendors.create(payload);
        alert("Vendor created successfully");
      }

      setShowModal(false);
      setEditId(null);
      setForm({ ...EMPTY_FORM });
      fetchData();
    } catch (err) {
      console.error("Vendor save failed:", err.message);
      alert("Something went wrong");
    }
    finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (
      !window.confirm("Delete this vendor?")
    )
      return;

    try {
      await itHelpdeskAPI.vendors.remove(id);
      fetchData();



    } catch (err) {



      console.error("Vendor delete failed:", err.message);
      
      alert("Delete failed");

    }


  };
  const statusColor = (s) => {
    return s === "Active" ? "success" : "default";
  };


  const typeColor = (t) => {

    switch (t) {

      case "Transporter":
        return "primary";

      case "CHA":
        return "info";

      case "Shipping Line":
        return "secondary";

      case "Supplier":
        return "success";

      case "Service Provider":
        return "warning";

      default:
        return "default";
    }

  };



  return (

    <Box>


      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >


        <Box display="flex" alignItems="center">
          <Tooltip title="Back">
            <IconButton
              onClick={handleBack}
              sx={{ 
                mr: 1, 
                bgcolor: "white", 
                border: "1px solid", 
                borderColor: "primary.main", 
                color: "primary.main",
                "&:hover": { bgcolor: "primary.light", color: "primary.dark" } 
              }}
            >
              <ArrowBackIcon sx={{ color: "primary.main" }} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="h5"
            fontWeight={700}
          >

            Vendors & Suppliers

          </Typography>
        </Box>



        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >

          Add Vendor

        </Button>


      </Box>

      {/* Search Input */}
      <Box mb={2} sx={{ maxWidth: 400 }}>
        <TextField
          label="Search Vendors"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>






      {
        loading ?


          <Box
            display="flex"
            justifyContent="center"
            py={4}
          >

            <CircularProgress />

          </Box>



          :


          <>
          <TableContainer>


            <Table>


              <TableHead>

                <TableRow>


                  <TableCell>Company Name</TableCell>

                  <TableCell>GST Number</TableCell>

                  <TableCell>PAN Number</TableCell>

                  <TableCell>Contact</TableCell>

                  <TableCell>Mobile</TableCell>

                  <TableCell>Email</TableCell>

                  <TableCell>Status</TableCell>

                  <TableCell align="right">
                    Action
                  </TableCell>


                </TableRow>


              </TableHead>




              <TableBody>



                {
                  filteredData.length === 0 ?


                    <TableRow>


                      <TableCell
                        colSpan={8}
                        align="center"
                      >

                        No vendor found

                      </TableCell>


                    </TableRow>



                    :



                    filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((v) => (


                      <TableRow
                        key={v._id}
                      >



                        <TableCell>
                          {v.name}
                        </TableCell>


                        <TableCell>
                          {v.gst_number || "-"}
                        </TableCell>


                        <TableCell>
                          {v.pan_number || "-"}
                        </TableCell>




                        <TableCell>
                          {v.contact_person || "-"}
                        </TableCell>


                        <TableCell>
                          {v.mobile_number || "-"}
                        </TableCell>



                        <TableCell>
                          {v.email || "-"}
                        </TableCell>




                        <TableCell>

                          <Chip

                            label={v.status}

                            color={
                              statusColor(v.status)
                            }

                            size="small"

                          />

                        </TableCell>




                        <TableCell align="right">


                          <Tooltip title="Edit">

                            <IconButton
                              onClick={() => handleOpen(v)}
                            >

                              <EditIcon />

                            </IconButton>


                          </Tooltip>




                          <Tooltip title="Delete">

                            <IconButton

                              color="error"

                              onClick={(e) =>
                                handleDelete(e, v._id)
                              }

                            >

                              <DeleteIcon />

                            </IconButton>


                          </Tooltip>



                        </TableCell>



                      </TableRow>


                    ))

                }



              </TableBody>


            </Table>


          </TableContainer>
          <TablePagination
            component="div"
            count={filteredData.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[15]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} of ${count}`}
          />
          </>
      }

      <Dialog

        open={showModal}

        onClose={() => setShowModal(false)}

        fullWidth

        maxWidth="sm"

      >


        <DialogTitle>

          {
            editId
              ?
              "Edit Vendor"
              :
              "Add Vendor"
          }

        </DialogTitle>



        <DialogContent>




          <TextField

            fullWidth

            size="small"

            label="Company Name *"

            margin="normal"

            value={form.name}

            onChange={(e) =>

              setForm({
                ...form,
                name: e.target.value
              })

            }

          />


          <TextField

            fullWidth

            size="small"

            label="GST Number"

            margin="normal"

            value={form.gst_number}

            onChange={(e) =>

              setForm({
                ...form,
                gst_number: e.target.value
              })

            }

          />


          <TextField

            fullWidth

            size="small"

            label="PAN Number"

            margin="normal"

            value={form.pan_number}

            onChange={(e) =>

              setForm({
                ...form,
                pan_number: e.target.value
              })

            }

          />






          <TextField

            fullWidth

            size="small"

            label="Contact Person *"

            margin="normal"

            value={form.contact_person}

            onChange={(e) =>

              setForm({
                ...form,
                contact_person: e.target.value
              })

            }

          />





          <TextField

            fullWidth

            size="small"

            label="Mobile Number *"

            margin="normal"

            value={form.mobile_number}

            onChange={(e) =>

              setForm({
                ...form,
                mobile_number: e.target.value
              })

            }

          />






          <TextField

            fullWidth

            size="small"

            label="Email *"

            margin="normal"

            value={form.email}

            onChange={(e) =>

              setForm({
                ...form,
                email: e.target.value
              })

            }

          />









        </DialogContent>






        <DialogActions>


          <Button

            disabled={saving}

            onClick={() =>
              setShowModal(false)
            }

          >

            Cancel

          </Button>




          <Button

            variant="contained"

            disabled={saving}

            onClick={handleSave}

          >


            {
              saving
                ?
                "Saving..."
                :
                "Save"
            }


          </Button>



        </DialogActions>



      </Dialog>





    </Box>

  );


}