// import React from "react";
// import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";

// const ConfirmDialog = ({ open, handleClose, handleConfirm, message }) => (
//   <Dialog open={open} onClose={handleClose} aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
//     <DialogTitle id="confirm-dialog-title">{"Confirm Action"}</DialogTitle>
//     <DialogContent>{message}</DialogContent>
//     <DialogActions>
//       <Button onClick={handleClose} color="primary">
//         Cancel
//       </Button>
//       <Button onClick={handleConfirm} color="primary" autoFocus>
//         Confirm
//       </Button>
//     </DialogActions>
//   </Dialog>
// );

// export default ConfirmDialog;

import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
} from "@mui/material";

const ConfirmDialog = ({
  open,
  handleClose,
  handleConfirm,
  message,
  isEdit = false, // Flag to determine edit mode
  editValues = {},
  onEditChange = () => {},
}) => (
  <Dialog
    open={open}
    onClose={handleClose}
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-description"
  >
    <DialogTitle id="confirm-dialog-title">
      {isEdit ? "Edit Document" : "Confirm Action"}
    </DialogTitle>
    <DialogContent>
      {isEdit ? (
        <>
          <TextField
            fullWidth
            margin="dense"
            label="Document Name"
            value={editValues.document_name || ""}
            onChange={(e) =>
              onEditChange({ ...editValues, document_name: e.target.value })
            }
            variant="outlined"
          />
          <TextField
            fullWidth
            margin="dense"
            label="Document Code"
            value={editValues.document_code || ""}
            onChange={(e) =>
              onEditChange({ ...editValues, document_code: e.target.value })
            }
            variant="outlined"
          />
        </>
      ) : (
        message
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Cancel
      </Button>
      <Button onClick={handleConfirm} color="primary" autoFocus>
        {isEdit ? "Save" : "Confirm"}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
