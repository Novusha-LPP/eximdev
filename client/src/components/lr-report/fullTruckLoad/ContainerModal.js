import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
} from "@mui/material";

const INITIAL_CONTAINER_DATA = {
  tr_no: "",
  container_number: "",
  seal_no: "",
  container_type: "",
  gross_weight: "",
  tare_weight: "",
  net_weight: "",
  sr_cel_no: "",
  sr_cel_FGUID: "",
  sr_cel_id: "",
  goods_pickup: "",
  goods_delivery: "",
  own_hired: "",
  eWay_bill: "",
  isOccupied: "",
  type_of_vehicle: "",
  driver_name: "",
  driver_phone: "",
  vehicle_no: "",
  status: "",
  elock: "",
  tracking_status: "",
  remarks: "",
};

const ContainerModal = ({
  open,
  onClose,
  onSave,
  containerData = INITIAL_CONTAINER_DATA,
  onInputChange,
  isSaving,
  title = "Add/Edit LR Container",
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Grid container spacing={2}>
        {Object.keys(INITIAL_CONTAINER_DATA).map((field, idx) => (
          <Grid item xs={12} sm={6} key={field}>
            <TextField
              label={field
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              value={containerData[field] || ""}
              onChange={onInputChange(field)}
              fullWidth
              size="small"
              variant="outlined"
            />
          </Grid>
        ))}
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={isSaving}>
        Cancel
      </Button>
      <Button
        onClick={onSave}
        color="primary"
        variant="contained"
        disabled={isSaving}
      >
        {isSaving ? "Saving..." : "Save"}
      </Button>
    </DialogActions>
  </Dialog>
);

export { INITIAL_CONTAINER_DATA };
export default ContainerModal;
