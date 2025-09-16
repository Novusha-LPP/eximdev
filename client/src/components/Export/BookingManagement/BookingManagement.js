import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Button, TextField, Select,
  MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper,
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_STRING}/job-booking`; // Adjust base URL accordingly

const BookingManagement = ({ jobId }) => {
  const [job, setJob] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [confirmations, setConfirmations] = useState([]);

  // Form states for add/update
  const [openVesselDialog, setOpenVesselDialog] = useState(false);
  const [vesselForm, setVesselForm] = useState({ name: '', voyageNumber: '', scheduleDate: '', portOfLoading: '', portOfDischarge: '', carrier: '' });
  const [editingVesselIndex, setEditingVesselIndex] = useState(null);

  const [openBookingDialog, setOpenBookingDialog] = useState(false);
  const [bookingForm, setBookingForm] = useState({ vessel: '', containerType: '', containerQuantity: 1, shippingDate: '', shipperName: '', consigneeName: '' });
  const [editingBookingIndex, setEditingBookingIndex] = useState(null);

  useEffect(() => {
    fetchJobData();
  }, []);

  const fetchJobData = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/${jobId}`);
      setJob(data);
      setVessels(data.vessel || []);
      setBookings(data.booking || []);
      setConfirmations(data.bookingConfirmation || []);
    } catch (error) {
      console.error('Error fetching job:', error);
    }
  };

  // Vessel functions
  const handleVesselChange = (e) => setVesselForm({ ...vesselForm, [e.target.name]: e.target.value });

  const openAddVessel = () => {
    setVesselForm({ name: '', voyageNumber: '', scheduleDate: '', portOfLoading: '', portOfDischarge: '', carrier: '' });
    setEditingVesselIndex(null);
    setOpenVesselDialog(true);
  };

  const openEditVessel = (index) => {
    setVesselForm(vessels[index]);
    setEditingVesselIndex(index);
    setOpenVesselDialog(true);
  };

  const saveVessel = async () => {
    try {
      if (editingVesselIndex === null) {
        await axios.post(`${API_BASE}/${jobId}/vessels`, vesselForm);
      } else {
        await axios.put(`${API_BASE}/${jobId}/vessels/${editingVesselIndex}`, vesselForm);
      }
      setOpenVesselDialog(false);
      fetchJobData();
    } catch (error) {
      console.error('Error saving vessel:', error);
    }
  };

  const deleteVessel = async (index) => {
    if (!window.confirm('Delete this vessel?')) return;
    try {
      await axios.delete(`${API_BASE}/${jobId}/vessels/${index}`);
      fetchJobData();
    } catch (error) {
      console.error('Error deleting vessel:', error);
    }
  };

  // Booking functions
  const handleBookingChange = (e) => setBookingForm({ ...bookingForm, [e.target.name]: e.target.value });

  const openAddBooking = () => {
    setBookingForm({ vessel: '', containerType: '', containerQuantity: 1, shippingDate: '', shipperName: '', consigneeName: '' });
    setEditingBookingIndex(null);
    setOpenBookingDialog(true);
  };

  const openEditBooking = (index) => {
    setBookingForm(bookings[index]);
    setEditingBookingIndex(index);
    setOpenBookingDialog(true);
  };

  const saveBooking = async () => {
    try {
      if (editingBookingIndex === null) {
        await axios.post(`${API_BASE}/${jobId}/bookings`, bookingForm);
      } else {
        await axios.put(`${API_BASE}/${jobId}/bookings/${editingBookingIndex}`, bookingForm);
      }
      setOpenBookingDialog(false);
      fetchJobData();
    } catch (error) {
      console.error('Error saving booking:', error);
    }
  };

  const deleteBooking = async (index) => {
    if (!window.confirm('Delete this booking?')) return;
    try {
      await axios.delete(`${API_BASE}/${jobId}/bookings/${index}`);
      fetchJobData();
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>Booking Management - Job {jobId}</Typography>

      {/* Vessels section */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Vessels</Typography>
          <Button variant="contained" onClick={openAddVessel}>Add Vessel</Button>
        </Box>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Voyage Number</TableCell>
                <TableCell>Schedule Date</TableCell>
                <TableCell>Port Loading</TableCell>
                <TableCell>Port Discharge</TableCell>
                <TableCell>Carrier</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vessels.map((v, idx) => (
                <TableRow key={idx}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.voyageNumber}</TableCell>
                  <TableCell>{new Date(v.scheduleDate).toLocaleDateString()}</TableCell>
                  <TableCell>{v.portOfLoading}</TableCell>
                  <TableCell>{v.portOfDischarge}</TableCell>
                  <TableCell>{v.carrier}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEditVessel(idx)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => deleteVessel(idx)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {vessels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">No vessels available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Vessel dialog */}
      <Dialog open={openVesselDialog} onClose={() => setOpenVesselDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingVesselIndex === null ? 'Add Vessel' : 'Edit Vessel'}</DialogTitle>
        <DialogContent>
          <TextField name="name" label="Name" fullWidth margin="normal" value={vesselForm.name} onChange={handleVesselChange} />
          <TextField name="voyageNumber" label="Voyage Number" fullWidth margin="normal" value={vesselForm.voyageNumber} onChange={handleVesselChange} />
          <TextField name="scheduleDate" label="Schedule Date" type="date" fullWidth margin="normal" value={vesselForm.scheduleDate ? vesselForm.scheduleDate.split('T')[0] : ''} onChange={handleVesselChange} InputLabelProps={{ shrink: true }} />
          <TextField name="portOfLoading" label="Port of Loading" fullWidth margin="normal" value={vesselForm.portOfLoading} onChange={handleVesselChange} />
          <TextField name="portOfDischarge" label="Port of Discharge" fullWidth margin="normal" value={vesselForm.portOfDischarge} onChange={handleVesselChange} />
          <TextField name="carrier" label="Carrier" fullWidth margin="normal" value={vesselForm.carrier} onChange={handleVesselChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVesselDialog(false)}>Cancel</Button>
          <Button onClick={saveVessel} variant="contained">{editingVesselIndex === null ? 'Add' : 'Update'}</Button>
        </DialogActions>
      </Dialog>

      {/* Bookings section */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Bookings</Typography>
          <Button variant="contained" onClick={openAddBooking}>Add Booking</Button>
        </Box>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vessel</TableCell>
                <TableCell>Container Type</TableCell>
                <TableCell>Container Qty</TableCell>
                <TableCell>Shipping Date</TableCell>
                <TableCell>Shipper Name</TableCell>
                <TableCell>Consignee Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((b, idx) => (
                <TableRow key={idx}>
                  <TableCell>{b.vessel?.name || b.vessel}</TableCell>
                  <TableCell>{b.containerType}</TableCell>
                  <TableCell>{b.containerQuantity}</TableCell>
                  <TableCell>{b.shippingDate ? new Date(b.shippingDate).toLocaleDateString() : ''}</TableCell>
                  <TableCell>{b.shipperName}</TableCell>
                  <TableCell>{b.consigneeName}</TableCell>
                  <TableCell>{b.status}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEditBooking(idx)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => deleteBooking(idx)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">No bookings available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Booking dialog */}
      <Dialog open={openBookingDialog} onClose={() => setOpenBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBookingIndex === null ? 'Add Booking' : 'Edit Booking'}</DialogTitle>
        <DialogContent>
          <TextField name="vessel" label="Vessel (ID or Name)" fullWidth margin="normal" value={bookingForm.vessel} onChange={handleBookingChange} />
          <TextField name="containerType" label="Container Type" fullWidth margin="normal" value={bookingForm.containerType} onChange={handleBookingChange} />
          <TextField name="containerQuantity" label="Container Quantity" type="number" fullWidth margin="normal" value={bookingForm.containerQuantity} onChange={handleBookingChange} />
          <TextField name="shippingDate" label="Shipping Date" type="date" fullWidth margin="normal" value={bookingForm.shippingDate ? bookingForm.shippingDate.split('T')[0] : ''} onChange={handleBookingChange} InputLabelProps={{ shrink: true }} />
          <TextField name="shipperName" label="Shipper Name" fullWidth margin="normal" value={bookingForm.shipperName} onChange={handleBookingChange} />
          <TextField name="consigneeName" label="Consignee Name" fullWidth margin="normal" value={bookingForm.consigneeName} onChange={handleBookingChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBookingDialog(false)}>Cancel</Button>
          <Button onClick={saveBooking} variant="contained">{editingBookingIndex === null ? 'Add' : 'Update'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookingManagement;
