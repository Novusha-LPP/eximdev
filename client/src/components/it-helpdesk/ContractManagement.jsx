import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddIcon from "@mui/icons-material/Add";


const EMPTY_FORM = {
  contract_type: "AMC",
  vendor: "",
  contract_number: "",
  start_date: "",
  end_date: "",
  coverage_details: "",
  renewal_reminder_days: "30",
};


export default function ContractManagement() {

  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });


  // GET CONTRACTS
  const fetchData = async () => {

    setLoading(true);

    try {

      const res = await itHelpdeskAPI.contracts.getAll();

      console.log("CONTRACT DATA:", res.data);


      // handle different api response
      if (Array.isArray(res.data)) {
        setData(res.data);
      }
      else if (res.data?.contracts) {
        setData(res.data.contracts);
      }
      else {
        setData([]);
      }


    } catch (err) {

      console.error(
        "GET CONTRACT ERROR:",
        err.response?.data || err
      );

      setData([]);

    }
    finally {
      setLoading(false);
    }

  };



  // GET VENDORS
  const fetchVendors = async () => {

    try {

      const res = await itHelpdeskAPI.vendors.getAll();

      setVendors(res.data || []);

    }
    catch (err) {
      console.error(err);
    }

  };



  useEffect(() => {

    fetchData();
    fetchVendors();

  }, []);



  // SAVE / UPDATE
  const handleSave = async () => {

    // Validation: Check all fields
    if (
      !form.contract_type ||
      !form.vendor ||
      !form.contract_number.trim() ||
      !form.start_date ||
      !form.end_date ||
      !form.coverage_details.trim()
    ) {
      alert("Please fill all required fields");
      return;
    }


    const payload = {

      contract_type: form.contract_type,
      vendor: form.vendor,
      contract_number: form.contract_number.trim(),
      coverage_details: form.coverage_details.trim(),
      renewal_reminder_days:
        Number(form.renewal_reminder_days) || 30,
      start_date: form.start_date,
      end_date: form.end_date

    };


    console.log("PAYLOAD:", payload);



    try {


      if (editId) {

        await itHelpdeskAPI.contracts.update(
          editId,
          payload
        );

      }
      else {

        await itHelpdeskAPI.contracts.create(
          payload
        );

      }



      // close modal
      setShowModal(false);

      // reset
      setEditId(null);
      setForm({ ...EMPTY_FORM });


      // reload table
      await fetchData();



    }
    catch (err) {

      console.error(
        "SAVE ERROR:",
        err.response?.data || err
      );

    }

  };




  // DELETE
  const handleDelete = async (id) => {


    if (!window.confirm("Delete this contract?"))
      return;


    try {

      await itHelpdeskAPI.contracts.remove(id);

      fetchData();

    }
    catch (err) {

      console.error(err);

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
          Contracts (AMC / Warranty)
        </Typography>


        <Button

          variant="contained"

          startIcon={<AddIcon />}

          onClick={() => {

            setEditId(null);

            setForm({ ...EMPTY_FORM });

            setShowModal(true);

          }}

        >
          Add Contract
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

                  <TableCell>Type</TableCell>

                  <TableCell>Contract No</TableCell>

                  <TableCell>Start Date</TableCell>

                  <TableCell>End Date</TableCell>

                  <TableCell>Status</TableCell>

                  <TableCell align="right">
                    Actions
                  </TableCell>

                </TableRow>

              </TableHead>



              <TableBody>


                {
                  data.length === 0 ?

                    <TableRow>

                      <TableCell
                        colSpan={6}
                        align="center"
                      >
                        No contracts found
                      </TableCell>

                    </TableRow>


                    :

                    data.map(c => (


                      <TableRow key={c._id}>


                        <TableCell>
                          {c.contract_type}
                        </TableCell>


                        <TableCell>
                          {c.contract_number}
                        </TableCell>



                        <TableCell>

                          {
                            c.start_date
                              ?
                              new Date(c.start_date)
                                .toLocaleDateString()
                              :
                              "—"
                          }

                        </TableCell>



                        <TableCell>

                          {
                            c.end_date
                              ?
                              new Date(c.end_date)
                                .toLocaleDateString()
                              :
                              "—"
                          }

                        </TableCell>



                        <TableCell>
                          {c.status || "Active"}
                        </TableCell>



                        <TableCell align="right">


                          <Button

                            size="small"

                            onClick={() => {

                              setEditId(c._id);

                              setForm({
                                ...EMPTY_FORM,
                                ...c
                              });

                              setShowModal(true);

                            }}

                          >
                            Edit
                          </Button>



                          <Button

                            size="small"

                            color="error"

                            onClick={() => handleDelete(c._id)}

                          >
                            Delete
                          </Button>


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

        maxWidth="sm"

        fullWidth

      >


        <DialogTitle>

          {
            editId ? "Edit Contract" : "New Contract"
          }

        </DialogTitle>



        <DialogContent>



          <TextField

            select

            label="Contract Type *"

            fullWidth

            size="small"

            sx={{ mt: 2, mb: 2 }}

            required

            value={form.contract_type}

            onChange={
              e => setForm({
                ...form,
                contract_type: e.target.value
              })
            }

          >

            <MenuItem value="AMC">
              AMC
            </MenuItem>

            <MenuItem value="Warranty">
              Warranty
            </MenuItem>


          </TextField>





          <TextField

            select

            label="Vendor *"

            fullWidth

            size="small"

            sx={{ mb: 2 }}

            required

            value={form.vendor || ""}

            onChange={
              e => setForm({
                ...form,
                vendor: e.target.value
              })
            }

          >


            <MenuItem value="" disabled>
              Select Vendor
            </MenuItem>


            {
              vendors.map(v => (

                <MenuItem
                  key={v._id}
                  value={v._id}
                >

                  {v.name}

                </MenuItem>

              ))
            }


          </TextField>





          <TextField

            label="Contract Number *"

            fullWidth

            size="small"

            sx={{ mb: 2 }}

            required

            value={form.contract_number}

            onChange={
              e => setForm({
                ...form,
                contract_number: e.target.value
              })
            }

          />




          <TextField

            type="date"

            label="Start Date *"

            fullWidth

            size="small"

            sx={{ mb: 2 }}

            required

            InputLabelProps={{
              shrink: true
            }}

            value={form.start_date?.substring(0, 10)}

            onChange={
              e => setForm({
                ...form,
                start_date: e.target.value
              })
            }

          />




          <TextField

            type="date"

            label="End Date *"

            fullWidth

            size="small"

            sx={{ mb: 2 }}

            required

            InputLabelProps={{
              shrink: true
            }}

            value={form.end_date?.substring(0, 10)}

            onChange={
              e => setForm({
                ...form,
                end_date: e.target.value
              })
            }

          />




          <TextField

            label="Coverage Details *"

            fullWidth

            multiline

            minRows={2}

            required

            value={form.coverage_details}

            onChange={
              e => setForm({
                ...form,
                coverage_details: e.target.value
              })
            }

          />


        </DialogContent>



        <DialogActions>


          <Button onClick={() => setShowModal(false)}>
            Cancel
          </Button>


          <Button
            variant="contained"
            onClick={handleSave}
          >
            Save
          </Button>


        </DialogActions>



      </Dialog>



    </Box>

  );

}
