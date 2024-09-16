import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import axios from "axios";
// import { handleFileUpload } from "../../utils/awsFileUpload";
import { uploadFileToS3 } from "../../utils/awsFileUpload";
import { useParams } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import DeleteIcon from "@mui/icons-material/Delete";
// import { Checkbox, FormControlLabel, TextField } from "@mui/material";
import {
  Checkbox,
  FormControlLabel,
  TextField,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  DialogContentText,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";

function EditDoPlanning() {
  const [data, setData] = React.useState();
  const [kycData, setKycData] = React.useState("");
  const [fileSnackbar, setFileSnackbar] = React.useState(false);
  const { _id } = useParams();
  //
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [openImageDeleteModal, setOpenImageDeleteModal] = useState(false);

  React.useEffect(() => {
    async function getData() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
      );
      setData({
        ...res.data,
        shipping_line_invoice: res.data.shipping_line_invoice === "Yes",
        payment_made: res.data.payment_made === "Yes",
        do_processed: res.data.do_processed === "Yes",
        other_invoices: res.data.other_invoices === "Yes",
        security_deposit: res.data.security_deposit === "Yes",
      });
    }

    getData();
  }, [_id]);

  const formik = useFormik({
    initialValues: {
      security_deposit: false,
      security_amount: "",
      utr: [],
      other_invoices: false,
      payment_made: false,
      do_processed: false,
      do_documents: [],
      do_validity: "",
      do_copies: [],
      shipping_line_invoice: false,
      shipping_line_invoice_date: "",
      shipping_line_invoice_imgs: [],
      do_queries: [{ query: "", reply: "" }],
      do_completed: false,
    },

    onSubmit: async (values, { resetForm }) => {
      // Convert booleans back to "Yes" or "No"
      const data = {
        ...values,
        _id,
        shipping_line_invoice: values.shipping_line_invoice ? "Yes" : "No",
        payment_made: values.payment_made ? "Yes" : "No",
        do_processed: values.do_processed ? "Yes" : "No",
        do_completed: values.do_completed ? "Yes" : "No",
        other_invoices: values.other_invoices ? "Yes" : "No",
        security_deposit: values.security_deposit ? "Yes" : "No",
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-do-planning`,
        data
      );
      alert(res.data.message);
      resetForm();
    },
  });

  React.useEffect(() => {
    if (data) {
      const updatedData = {
        ...data,
        do_queries: data.do_queries || [{ query: "", reply: "" }],
      };

      formik.setValues(updatedData);

      async function getKycDocs() {
        const importer = data.importer;
        const shipping_line_airline = data.shipping_line_airline;
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/get-kyc-documents`,
          { importer, shipping_line_airline }
        );
        setKycData(res.data);
      }

      getKycDocs();
    }

    // eslint-disable-next-line
  }, [data]);

  //
  const handleFileUpload = async (event, fieldName) => {
    const files = event.target.files;
    const uploadedFiles = [...(formik.values[fieldName] || [])];
    for (const file of files) {
      try {
        const result = await uploadFileToS3(file, fieldName);
        uploadedFiles.push(result.Location);
      } catch (error) {
        // toast.error(`Failed to upload ${file.name}. Please try again.`);
      }
    }
    formik.setFieldValue(fieldName, uploadedFiles);
  };

  const handleDeleteImage = (fieldName, index) => {
    const currentFieldValue = formik.values[fieldName] || [];
    const newImages = [...currentFieldValue];
    newImages.splice(index, 1);
    formik.setFieldValue(fieldName, newImages);
    // toast.success("Image deleted successfully.");
  };

  const ConfirmDialog = ({ open, handleClose, handleConfirm, message }) => (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Are you sure?"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
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
  const renderImagePreview = (fieldName) => {
    const links = (formik.values[fieldName] || []).filter(
      (link) => link.trim() !== ""
    );
    if (links.length === 0) return null;
    const handleClickOpen = (index, fieldName) => {
      setDeleteIndex(index);
      setCurrentField(fieldName);
      setOpenImageDeleteModal(true);
    };
    const handleClose = () => {
      setOpenImageDeleteModal(false);
    };
    const handleConfirm = () => {
      handleDeleteImage(currentField, deleteIndex);
      setOpenImageDeleteModal(false);
    };
    return (
      <Box mt={1} style={{ maxHeight: "150px", overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Link</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {links.map((link, index) => (
              <TableRow key={index}>
                <TableCell>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", color: "blue" }}
                  >
                    {link}
                  </a>
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleClickOpen(index, fieldName)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ConfirmDialog
          open={openImageDeleteModal}
          handleClose={handleClose}
          handleConfirm={handleConfirm}
          message={`Are you sure you want to delete this image from the server as well?`}
        />
      </Box>
    );
  };
  //
  const handleAddField = () => {
    formik.setValues({
      ...formik.values,
      do_queries: [
        ...formik.values.do_queries,
        {
          query: "",
          reply: "",
        },
      ],
    });
  };

  return (
    <div>
      <form onSubmit={formik.handleSubmit}>
        <h5>Job Number: {data?.job_no}</h5>
        <h5>Importer: {data?.importer}</h5>
        <strong>KYC Documents:&nbsp;</strong>
        <br />
        {kycData.kyc_documents?.map((doc, id) => (
          <div key={id}>
            <a href={doc}>View</a>
            <br />
          </div>
        ))}
        <strong>KYC Valid Upto:&nbsp;</strong>
        {kycData.kyc_valid_upto}
        <br />
        <strong>BL Status:&nbsp;</strong>
        {data?.obl_telex_bl}
        <br />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.shipping_line_invoice}
              onChange={(e) =>
                formik.setFieldValue("shipping_line_invoice", e.target.checked)
              }
              name="shipping_line_invoice"
              color="primary"
            />
          }
          label="Shipping line invoice"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.payment_made}
              onChange={(e) =>
                formik.setFieldValue("payment_made", e.target.checked)
              }
              name="payment_made"
              color="primary"
            />
          }
          label="Payment Made"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.do_processed}
              onChange={(e) =>
                formik.setFieldValue("do_processed", e.target.checked)
              }
              name="do_processed"
              color="primary"
            />
          }
          label="DO processed"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.other_invoices}
              onChange={(e) =>
                formik.setFieldValue("other_invoices", e.target.checked)
              }
              name="other_invoices"
              color="primary"
            />
          }
          label="Other invoices"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.security_deposit}
              onChange={(e) =>
                formik.setFieldValue("security_deposit", e.target.checked)
              }
              name="security_deposit"
              color="primary"
            />
          }
          label="Security Deposit"
        />

        <TextField
          date
          fullWidth
          size="small"
          margin="normal"
          variant="outlined"
          type="date"
          id="shipping_line_invoice_date"
          name="shipping_line_invoice_date"
          label="Shipping line invoice date"
          value={formik.values.shipping_line_invoice_date}
          onChange={formik.handleChange}
          InputLabelProps={{ shrink: true }}
        />

        <Row>
          <Col>
            {/* Upload Shipping Line Invoices */}
            <label htmlFor="shipping_line_invoice_imgs" className="btn">
              Upload Shipping Line Invoices
            </label>
            <input
              type="file"
              multiple
              name="shipping_line_invoice_imgs"
              id="shipping_line_invoice_imgs"
              onChange={(e) =>
                handleFileUpload(e, "shipping_line_invoice_imgs")
              }
              style={{ display: "none" }}
            />
            <br />
            <br />
            {renderImagePreview("shipping_line_invoice_imgs")}
          </Col>
          <Col>
            {/* Upload DO Processed Attachment */}
            <label htmlFor="do_documents" className="btn">
              DO Documents
            </label>
            <input
              type="file"
              multiple
              name="do_documents"
              id="do_documents"
              onChange={(e) => handleFileUpload(e, "do_documents")}
              style={{ display: "none" }}
            />
            <br />
            <br />

            {renderImagePreview("do_documents")}
          </Col>
          <Col></Col>
        </Row>

        <br />
        {formik.values.security_deposit === "Yes" && (
          <TextField
            fullWidth
            size="small"
            margin="normal"
            variant="outlined"
            id="security_amount"
            name="security_amount"
            label="Security amount"
            value={formik.values.security_amount}
            onChange={formik.handleChange}
          />
        )}
        <strong>UTR:&nbsp;</strong>
        {formik.values.utr?.map((file, index) => {
          return (
            <div key={index}>
              <a href={file}>{file}</a>
              <br />
            </div>
          );
        })}
        <br />
        <br />

        <TextField
          type="date"
          fullWidth
          size="small"
          margin="normal"
          variant="outlined"
          id="do_validity"
          name="do_validity"
          label="DO Validity"
          value={formik.values.do_validity}
          onChange={formik.handleChange}
          InputLabelProps={{ shrink: true }}
        />
        {/* Upload DO Copies */}
        <label htmlFor="do_copies" className="btn">
          Upload DO Copies
        </label>
        <input
          type="file"
          multiple
          name="do_copies"
          id="do_copies"
          onChange={(e) => handleFileUpload(e, "do_copies")}
          style={{ display: "none" }}
        />
        <br />
        <br />

        {renderImagePreview("do_copies")}

        <h5>DO Queries</h5>
        {formik.values.do_queries.map((item, id) => {
          return (
            <div key={id}>
              <TextField
                fullWidth
                size="small"
                margin="normal"
                variant="outlined"
                id={`do_queries[${id}].query`}
                name={`do_queries[${id}].query`}
                label="Query"
                value={item.query}
                onChange={formik.handleChange}
              />
              {item.reply}
            </div>
          );
        })}
        <br />
        <button type="button" className="btn" onClick={handleAddField}>
          Add Query
        </button>
        <br />
        <br />
        <FormControlLabel
          control={
            <Checkbox
              checked={formik.values.do_completed}
              onChange={(e) =>
                formik.setFieldValue("do_completed", e.target.checked)
              }
              name="do_completed"
              color="primary"
            />
          }
          label="DO Completed"
        />
        <br />
        <button type="submit" className="btn">
          Submit
        </button>
      </form>

      <Snackbar
        open={fileSnackbar}
        message={"File uploaded successfully!"}
        sx={{ left: "auto !important", right: "24px !important" }}
      />
    </div>
  );
}

export default React.memo(EditDoPlanning);
