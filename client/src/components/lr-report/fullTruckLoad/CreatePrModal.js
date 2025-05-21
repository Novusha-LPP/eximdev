import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Button,
} from "@mui/material";

const INITIAL_PR_DATA = {
  pr_no: "",
  // pr_date: new Date().toISOString().split("T")[0],
  branch: "",
  consignor: "",
  consignee: "",
  container_type: "",
  container_count: "",
  type_of_vehicle: "",
  description: "",
  shipping_line: "",
  container_loading: "",
  container_offloading: "",
  do_validity: "",
  instructions: "",
  document_no: "",
  document_date: "",
  goods_pickup: "",
  goods_delivery: "",
  containers: [],
  import_export: "",
};

const CreatePrModal = ({
  open,
  onClose,
  onSave,
  prData,
  onInputChange,
  isSaving,
  title = "New PR",
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <TextField
              label="PR Number"
              value={prData.pr_no}
              onChange={onInputChange("pr_no")}
              fullWidth
            />
          </Grid>
          {/* <Grid item xs={6}>
            <TextField
              label="PR Date"
              type="date"
              value={prData.pr_date}
              onChange={onInputChange("pr_date")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid> */}
          <Grid item xs={6}>
            <TextField
              label="Branch"
              value={prData.branch}
              onChange={onInputChange("branch")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Consignor"
              value={prData.consignor}
              onChange={onInputChange("consignor")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Consignee"
              value={prData.consignee}
              onChange={onInputChange("consignee")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Container Type"
              value={prData.container_type}
              onChange={onInputChange("container_type")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Container Count"
              value={prData.container_count}
              onChange={onInputChange("container_count")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Vehicle Type"
              value={prData.type_of_vehicle}
              onChange={onInputChange("type_of_vehicle")}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={prData.description}
              onChange={onInputChange("description")}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Shipping Line"
              value={prData.shipping_line}
              onChange={onInputChange("shipping_line")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Container Loading"
              value={prData.container_loading}
              onChange={onInputChange("container_loading")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Container Offloading"
              value={prData.container_offloading}
              onChange={onInputChange("container_offloading")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="DO Validity"
              type="date"
              value={prData.do_validity}
              onChange={onInputChange("do_validity")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Instructions"
              value={prData.instructions}
              onChange={onInputChange("instructions")}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Document No"
              value={prData.document_no}
              onChange={onInputChange("document_no")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Document Date"
              type="date"
              value={prData.document_date}
              onChange={onInputChange("document_date")}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Goods Pickup"
              value={prData.goods_pickup}
              onChange={onInputChange("goods_pickup")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Goods Delivery"
              value={prData.goods_delivery}
              onChange={onInputChange("goods_delivery")}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Import/Export"
              value={prData.import_export}
              onChange={onInputChange("import_export")}
              fullWidth
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>{" "}
        <Button
          onClick={onSave}
          variant="contained"
          color="primary"
          disabled={isSaving}
        >
          {title === "New PR" ? "Create" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { CreatePrModal, INITIAL_PR_DATA };
