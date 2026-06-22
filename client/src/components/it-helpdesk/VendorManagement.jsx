import React, { useState, useEffect } from "react";

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
  MenuItem
} from "@mui/material";


import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";

import { useAuditCRUD } from "./AuditLogs";
import { AuditLogProvider } from "../../contexts/AuditLogContext.js";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";



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
  vendor_code: "",
  vendor_type: "Supplier",
  contact_person: "",
  mobile_number: "",
  email: "",
  status: "Active"
};



export default function VendorManagement() {


  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [editId, setEditId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });


  // AUDIT

  const audit = useAuditCRUD(
    "Vendor Management",
    "Vendor"
  );



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


      audit.logError(
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


    audit.logView(
      "User opened Vendor Management"
    );


  }, []);






  const handleOpen = (record = null) => {


    if (record) {


      setEditId(record._id);


      setForm({

        name: record.name || "",

        vendor_code: record.vendor_code || "",

        vendor_type: record.vendor_type || "Supplier",

        contact_person: record.contact_person || "",

        mobile_number: record.mobile_number || "",

        email: record.email || "",

        status: record.status || "Active"

      });


      audit.logView(
        `Opened vendor ${record.name}`,
        record._id
      );



    } else {


      setEditId(null);

      setForm({ ...EMPTY_FORM });


      audit.logCreate(
        null,
        "Opened add vendor form"
      );


    }


    setShowModal(true);

  };







  const handleSave = async () => {


    if (
      !form.name.trim() ||
      !form.vendor_code.trim() ||
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

        vendor_code: form.vendor_code.trim(),

        vendor_type: form.vendor_type,

        contact_person: form.contact_person.trim(),

        mobile_number: form.mobile_number.trim(),

        email: form.email.trim(),

        status: form.status

      };





      if (editId) {



        await itHelpdeskAPI.vendors.update(
          editId,
          payload
        );



        audit.logUpdate(
          editId,
          `Vendor ${form.name} updated`
        );



        alert("Vendor updated successfully");



      } else {



        const res =
          await itHelpdeskAPI.vendors.create(payload);



        audit.logCreate(
          res.data?._id,
          `Vendor ${form.name} created`
        );



        alert("Vendor created successfully");


      }





      setShowModal(false);

      setEditId(null);

      setForm({ ...EMPTY_FORM });


      fetchData();



    } catch (err) {



      audit.logError(
        err.message,
        "Vendor save failed"
      );



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


      const vendor =
        data.find(x => x._id === id);



      await itHelpdeskAPI.vendors.remove(id);



      audit.logDelete(
        id,
        `Vendor ${vendor?.name} deleted`
      );



      fetchData();



    } catch (err) {



      audit.logError(
        err.message,
        "Vendor delete failed"
      );


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


        <Typography
          variant="h5"
          fontWeight={700}
        >

          Vendors & Suppliers

        </Typography>



        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >

          Add Vendor

        </Button>


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


          <TableContainer>


            <Table>


              <TableHead>

                <TableRow>


                  <TableCell>Name</TableCell>

                  <TableCell>Code</TableCell>

                  <TableCell>Type</TableCell>

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
                  data.length === 0 ?


                    <TableRow>


                      <TableCell
                        colSpan={8}
                        align="center"
                      >

                        No vendor found

                      </TableCell>


                    </TableRow>



                    :



                    data.map((v) => (


                      <TableRow
                        key={v._id}
                      >



                        <TableCell>
                          {v.name}
                        </TableCell>


                        <TableCell>
                          {v.vendor_code || "-"}
                        </TableCell>



                        <TableCell>

                          <Chip

                            label={v.vendor_type}

                            color={
                              typeColor(v.vendor_type)
                            }

                            size="small"

                          />

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

            label="Vendor Name *"

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

            label="Vendor Code *"

            margin="normal"

            value={form.vendor_code}

            onChange={(e) =>

              setForm({
                ...form,
                vendor_code: e.target.value
              })

            }

          />






          <TextField

            select

            fullWidth

            size="small"

            label="Vendor Type"

            margin="normal"

            value={form.vendor_type}

            onChange={(e) =>

              setForm({
                ...form,
                vendor_type: e.target.value
              })

            }

          >


            {

              VENDOR_TYPES.map(x => (


                <MenuItem
                  key={x}
                  value={x}
                >

                  {x}

                </MenuItem>


              ))

            }


          </TextField>






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







          <TextField

            select

            fullWidth

            size="small"

            label="Status"

            margin="normal"

            value={form.status}

            onChange={(e) =>

              setForm({
                ...form,
                status: e.target.value
              })

            }

          >


            <MenuItem value="Active">
              Active
            </MenuItem>


            <MenuItem value="Inactive">
              Inactive
            </MenuItem>


          </TextField>



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