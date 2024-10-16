import React from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";

const ConfirmDialog = ({ open, handleClose, handleConfirm, message }) => (
  <Dialog open={open} onClose={handleClose} aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
    <DialogTitle id="confirm-dialog-title">{"Confirm Action"}</DialogTitle>
    <DialogContent>{message}</DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Cancel
      </Button>
      <Button onClick={handleConfirm} color="primary" autoFocus>
        Confirm
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
