import React, { useState, useEffect, useCallback } from "react";
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
  MenuItem
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddIcon from "@mui/icons-material/Add";


const LICENSE_TYPES = [
  "Per User",
  "Per Device",
  "Subscription",
  "Enterprise",
  "OEM",
  "Trial"
];


const EMPTY_FORM = {
  license_name: "",
  license_code: "",
  software_name: "",
  vendor: "",
  license_type: "",
  expiry_date: "",
  cost: ""
};



export default function LicenseManagement() {


  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });




  // API DATA FIX

  const normalize = (x) => ({

    _id: x._id,


    license_name:
      x.license_name ||
      x.licenseName ||
      x.name ||
      x.license_title ||
      "",


    license_code:
      x.license_code ||
      x.licenseCode ||
      x.code ||
      x.license_id ||
      "",


    license_type:
      x.license_type ||
      x.licenseType ||
      x.type ||
      "",


    software_name:
      x.software_name ||
      x.softwareName ||
      x.product_name ||
      "",


    vendor:
      x.vendor || "",


    vendor_name:
      x.vendor?.name ||
      x.vendor_name ||
      x.publisher ||
      "-",


    expiry_date:
      x.expiry_date ||
      x.expiryDate ||
      "",


    cost: x.cost || 0


  });






  const fetchData = useCallback(async () => {


    setLoading(true);


    try {


      const res =
        await itHelpdeskAPI.licenses.getAll();



      console.log(
        "LICENSE DATA",
        res.data
      );



      setData(
        (res.data || []).map(normalize)
      );



    } catch (e) {

      console.log(e);

    }


    finally {

      setLoading(false);

    }

  }, []);





  const fetchVendors = useCallback(async () => {


    try {


      const res =
        await itHelpdeskAPI.vendors.getAll();


      setVendors(res.data || []);


    } catch (e) {

      console.log(e);

    }

  }, []);






  useEffect(() => {

    fetchData();
    fetchVendors();

  }, [fetchData, fetchVendors]);







  const handleSave = async () => {


    if (
      !form.license_name ||
      !form.license_code ||
      !form.software_name ||
      !form.vendor ||
      !form.license_type
    ) {

      alert("Please fill mandatory fields");

      return;

    }




    const payload = {


      license_name: form.license_name,

      license_code: form.license_code,

      software_name: form.software_name,

      vendor: form.vendor,

      license_type: form.license_type,


      expiry_date:
        form.expiry_date || null,


      cost:
        Number(form.cost || 0),



      // compatibility

      total_seats: 0,

      used_seats: 0

    };




    try {


      if (editId) {


        await itHelpdeskAPI.licenses.update(
          editId,
          payload
        );


      } else {


        await itHelpdeskAPI.licenses.create(
          payload
        );


      }



      await fetchData();


      setOpen(false);

      setEditId(null);

      setForm({ ...EMPTY_FORM });



    } catch (err) {

      console.log(
        err.response?.data || err
      );

      alert("Save failed");

    }


  };









  const edit = (item) => {


    setEditId(item._id);


    setForm({

      license_name: item.license_name,

      license_code: item.license_code,

      software_name: item.software_name,

      vendor: item.vendor?._id || item.vendor,

      license_type: item.license_type,


      expiry_date:
        item.expiry_date
          ?
          item.expiry_date.substring(0, 10)
          :
          "",


      cost: item.cost


    });


    setOpen(true);

  };








  const remove = async (id) => {


    if (!window.confirm("Delete license?"))
      return;


    await itHelpdeskAPI.licenses.remove(id);

    fetchData();


  };








  return (

    <Box>



      <Box
        display="flex"
        justifyContent="space-between"
        mb={2}
      >


        <Typography
          variant="h5"
          fontWeight={700}
        >

          Software License

        </Typography>



        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {

            setEditId(null);
            setForm({ ...EMPTY_FORM });
            setOpen(true);

          }}

        >

          Add License

        </Button>


      </Box>







      {
        loading ?


          <Box
            display="flex"
            justifyContent="center"
          >

            <CircularProgress />

          </Box>



          :


          <TableContainer>


            <Table>



              <TableHead>

                <TableRow>

                  <TableCell>License Name</TableCell>

                  <TableCell>License Code</TableCell>

                  <TableCell>Software</TableCell>

                  <TableCell>License Type</TableCell>

                  <TableCell>Vendor</TableCell>

                  <TableCell>Expiry</TableCell>

                  <TableCell>Action</TableCell>


                </TableRow>

              </TableHead>





              <TableBody>



                {
                  data.map(row => (


                    <TableRow key={row._id}>


                      <TableCell>
                        {row.license_name || "-"}
                      </TableCell>


                      <TableCell>
                        {row.license_code || "-"}
                      </TableCell>


                      <TableCell>
                        {row.software_name || "-"}
                      </TableCell>


                      <TableCell>
                        {row.license_type || "-"}
                      </TableCell>


                      <TableCell>
                        {row.vendor_name}
                      </TableCell>


                      <TableCell>

                        {
                          row.expiry_date
                            ?
                            new Date(row.expiry_date)
                              .toLocaleDateString()
                            :
                            "-"
                        }

                      </TableCell>



                      <TableCell>


                        <Button
                          size="small"
                          onClick={() => edit(row)}
                        >
                          Edit
                        </Button>


                        <Button
                          size="small"
                          color="error"
                          onClick={() => remove(row._id)}
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
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >


        <DialogTitle>
          License
        </DialogTitle>



        <DialogContent>



          <TextField
            label="License Name *"
            fullWidth
            size="small"
            sx={{ mt: 2, mb: 2 }}
            value={form.license_name}
            onChange={e => setForm({ ...form, license_name: e.target.value })}
          />



          <TextField
            label="License Code *"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.license_code}
            onChange={e => setForm({ ...form, license_code: e.target.value })}
          />



          <TextField
            label="Software Name *"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.software_name}
            onChange={e => setForm({ ...form, software_name: e.target.value })}
          />





          <TextField
            select
            label="Vendor *"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.vendor}
            onChange={e => setForm({ ...form, vendor: e.target.value })}
          >


            <MenuItem value="">
              Select
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
            select
            label="License Type *"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.license_type}
            onChange={e => setForm({ ...form, license_type: e.target.value })}
          >


            {
              LICENSE_TYPES.map(t => (

                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>

              ))
            }


          </TextField>




          <TextField
            type="date"
            label="Expiry Date"
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            value={form.expiry_date}
            onChange={e => setForm({ ...form, expiry_date: e.target.value })}
          />




        </DialogContent>



        <DialogActions>


          <Button onClick={() => setOpen(false)}>
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