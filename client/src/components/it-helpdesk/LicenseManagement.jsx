import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  Chip,
  Tooltip,
  InputAdornment
} from "@mui/material";

import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";

// Compute license status from expiry date
function computeLicenseStatus(expiryDate) {
  if (!expiryDate) return { label: "No Expiry", color: "default" };
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Expired", color: "error" };
  if (diffDays <= 30) return { label: "Expiring Soon", color: "warning" };
  return { label: "Active", color: "success" };
}


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
  cost: "",
  assigned_to: "",
  assigned_asset: ""
};



export default function LicenseManagement() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate("/it-helpdesk");
  };

  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);

  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.license_name || "").toLowerCase().includes(term) ||
      (item.license_code || "").toLowerCase().includes(term) ||
      (item.software_name || "").toLowerCase().includes(term) ||
      (item.vendor_name || "").toLowerCase().includes(term) ||
      (item.assigned_to || "").toLowerCase().includes(term) ||
      (item.assigned_asset || "").toLowerCase().includes(term)
    );
  });




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


    cost: x.cost || 0,

    assigned_to:
      x.assigned_to ||
      x.assignedTo ||
      x.assigned_user ||
      "",

    assigned_asset:
      x.assigned_asset ||
      x.assignedAsset ||
      ""

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

      assigned_to: form.assigned_to || "",

      assigned_asset: form.assigned_asset || "",

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


      cost: item.cost,

      assigned_to: item.assigned_to || "",

      assigned_asset: item.assigned_asset || ""

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
        alignItems="center"
        mb={2}
      >


        <Box display="flex" alignItems="center">
          <Tooltip title="Back">
            <IconButton
              onClick={handleBack}
              sx={{ 
                mr: 1, 
                bgcolor: "primary.main", 
                color: "white",
                "&:hover": { bgcolor: "primary.dark" } 
              }}
            >
              <ArrowBackIcon sx={{ color: "white" }} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="h5"
            fontWeight={700}
          >

            Software License

          </Typography>
        </Box>



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

      {/* Search Input */}
      <Box mb={2} sx={{ maxWidth: 400 }}>
        <TextField
          label="Search Licenses"
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

                  <TableCell>Expiry Date</TableCell>

                  <TableCell>Status</TableCell>

                  <TableCell>Assigned To</TableCell>

                  <TableCell>Action</TableCell>


                </TableRow>

              </TableHead>





              <TableBody>



                {
                  filteredData.map(row => (


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
                        {(() => {
                          const s = computeLicenseStatus(row.expiry_date);
                          return <Chip label={s.label} color={s.color} size="small" />;
                        })()}
                      </TableCell>

                      <TableCell>
                        <Tooltip title={row.assigned_asset ? `Asset: ${row.assigned_asset}` : ""}>
                          <span>{row.assigned_to || row.assigned_asset || "-"}</span>
                        </Tooltip>
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
            sx={{ mb: 2 }}
            value={form.expiry_date}
            onChange={e => setForm({ ...form, expiry_date: e.target.value })}
          />

          <TextField
            label="Assigned To (User)"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.assigned_to}
            onChange={e => setForm({ ...form, assigned_to: e.target.value })}
            placeholder="Employee name or email"
          />

          <TextField
            label="Assigned Asset"
            fullWidth
            size="small"
            sx={{ mb: 2 }}
            value={form.assigned_asset}
            onChange={e => setForm({ ...form, assigned_asset: e.target.value })}
            placeholder="Asset tag or name"
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