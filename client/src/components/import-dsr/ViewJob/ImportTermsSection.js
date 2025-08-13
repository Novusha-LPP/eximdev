import React from "react";
import { 
  TextField, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Typography,
  Box,
  IconButton
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import JobDetailsRowHeading from "../JobDetailsRowHeading";
import FileUpload from "../../gallery/FileUpload.js";
import ImagePreview from "../../gallery/ImagePreview.js";

const ImportTermsSection = ({ 
  formik,
  data,
  user,
  importTerms,
  handleImportTermsChange,
  setDutyModalOpen,
  isDutyPaidDateDisabled,
  isSubmissionDate
}) => {

  const handleOpenDutyModal = () => setDutyModalOpen(true);

  const handleBlStatusChange = (event) => {
    const value = event.target.value;
    if (value === "clear") {
      formik.setFieldValue("obl_telex_bl", "");
      formik.setFieldValue("is_obl_recieved", false);
      formik.setFieldValue("document_received_date", "");
    } else {
      formik.setFieldValue("obl_telex_bl", value);
      formik.setFieldValue("is_obl_recieved", true);
    }
  };

  const CompactField = ({ label, children }) => (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );

  return (
    <Box sx={{ p: 2 }}>
      <JobDetailsRowHeading heading="Import Terms & Processing Details" />

      {/* Terms of Invoice */}
      <Box sx={{ p: 2, bgcolor: "#fafafa", borderRadius: 1, mb: 2 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
          Terms of Invoice
        </Typography>
        <RadioGroup
          row
          name="import_terms"
          value={formik.values.import_terms || importTerms}
          onChange={handleImportTermsChange}
          sx={{ gap: 2 }}
        >
          <FormControlLabel value="CIF" control={<Radio size="small" />} label="CIF" />
          <FormControlLabel value="FOB" control={<Radio size="small" />} label="FOB" />
          <FormControlLabel value="CF" control={<Radio size="small" />} label="C&F" />
          <FormControlLabel value="CI" control={<Radio size="small" />} label="C&I" />
        </RadioGroup>
      </Box>

      {/* Tabular Illusion Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          bgcolor: "#fafafa",
          borderRadius: 1,
          mb: 2
        }}
      >
        <CompactField label={`${formik.values.import_terms || importTerms} Value (₹)`}>
          <TextField
            size="small"
            name="cifValue"
            type="number"
            value={formik.values.cifValue || ""}
            onChange={formik.handleChange}
            fullWidth
          />
        </CompactField>

        {["FOB", "CI"].includes(formik.values.import_terms || importTerms) && (
          <CompactField label="Freight (₹)">
            <TextField
              size="small"
              name="freight"
              type="number"
              value={formik.values.freight || ""}
              onChange={formik.handleChange}
              fullWidth
            />
          </CompactField>
        )}

        {["FOB", "CF"].includes(formik.values.import_terms || importTerms) && (
          <CompactField label="Insurance (₹)">
            <TextField
              size="small"
              name="insurance"
              type="number"
              value={formik.values.insurance || ""}
              onChange={formik.handleChange}
              fullWidth
            />
          </CompactField>
        )}

        <CompactField label="Gross Weight (KGS)">
          <TextField
            size="small"
            name="gross_weight"
            value={formik.values.gross_weight || ""}
            onChange={formik.handleChange}
            fullWidth
          />
        </CompactField>

        <CompactField label="Net Weight (KGS)">
          <TextField
            size="small"
            name="job_net_weight"
            value={formik.values.job_net_weight || ""}
            onChange={formik.handleChange}
            fullWidth
          />
        </CompactField>

        <CompactField label="BOE No">
          <TextField
            size="small"
            name="be_no"
            value={formik.values.be_no || ""}
            onChange={formik.handleChange}
            fullWidth
          />
        </CompactField>

        <CompactField label="BOE Date">
          <TextField
            size="small"
            type="date"
            name="be_date"
            value={formik.values.be_date || ""}
            onChange={formik.handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </CompactField>

        <CompactField label="Assessment Date">
          <TextField
            size="small"
            type="datetime-local"
            name="assessment_date"
            value={formik.values.assessment_date || ""}
            onChange={formik.handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </CompactField>

        <CompactField label="Examination Date">
          <Typography fontSize={13}>
            {data?.examination_date || "Not set"}
          </Typography>
        </CompactField>

        <CompactField label="BOE Filing">
          <RadioGroup
            row
            name="be_filing_type"
            value={formik.values.be_filing_type || ""}
            onChange={formik.handleChange}
            disabled={isSubmissionDate}
            sx={{ gap: 1 }}
          >
            <FormControlLabel value="Discharge" control={<Radio size="small" />} label="Discharge" />
            <FormControlLabel value="Railout" control={<Radio size="small" />} label="Railout" />
            <FormControlLabel value="Advanced" control={<Radio size="small" />} label="Advanced" disabled={isSubmissionDate} />
            <FormControlLabel value="Prior" control={<Radio size="small" />} label="Prior" disabled={isSubmissionDate} />
          </RadioGroup>
        </CompactField>

        <CompactField label="PCV Date">
          <TextField
            size="small"
            type="datetime-local"
            name="pcv_date"
            value={formik.values.pcv_date || ""}
            onChange={formik.handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </CompactField>

        <CompactField label="Duty Paid Date">
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              size="small"
              type="datetime-local"
              name="duty_paid_date"
              value={formik.values.duty_paid_date || ""}
              onChange={formik.handleChange}
              fullWidth
              disabled={isDutyPaidDateDisabled}
              InputLabelProps={{ shrink: true }}
            />
            <IconButton onClick={handleOpenDutyModal} size="small">
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          {isDutyPaidDateDisabled && (
            <Typography variant="caption" color="error">
              Add Assessment Date & IGST first
            </Typography>
          )}
        </CompactField>

        <CompactField label="Out of Charge Date">
          <TextField
            size="small"
            type="datetime-local"
            name="out_of_charge"
            value={formik.values.out_of_charge || ""}
            onChange={formik.handleChange}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </CompactField>
      </Box>

      {/* Document Upload Section */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          Document Uploads
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
          <Box>
            <FileUpload
              label="Checklist"
              bucketPath="checklist"
              onFilesUploaded={(newFiles) =>
                formik.setFieldValue("checklist", [...(formik.values.checklist || []), ...newFiles])
              }
              multiple
            />
            <ImagePreview
              images={formik.values.checklist || []}
              onDeleteImage={(index) => {
                const updatedFiles = [...formik.values.checklist];
                updatedFiles.splice(index, 1);
                formik.setFieldValue("checklist", updatedFiles);
              }}
            />
          </Box>

          <Box>
            <FileUpload
              label="Processed BE Copy"
              bucketPath="processed_be_attachment"
              onFilesUploaded={(newFiles) =>
                formik.setFieldValue("processed_be_attachment", [...(formik.values.processed_be_attachment || []), ...newFiles])
              }
              multiple
            />
            <ImagePreview
              images={formik.values.processed_be_attachment || []}
              onDeleteImage={(index) => {
                const updatedFiles = [...formik.values.processed_be_attachment];
                updatedFiles.splice(index, 1);
                formik.setFieldValue("processed_be_attachment", updatedFiles);
              }}
            />
          </Box>

          <Box>
            <FileUpload
              label="OOC Copy"
              bucketPath="ooc_copies"
              onFilesUploaded={(newFiles) =>
                formik.setFieldValue("ooc_copies", [...(formik.values.ooc_copies || []), ...newFiles])
              }
              multiple
            />
            <ImagePreview
              images={formik.values.ooc_copies || []}
              onDeleteImage={(index) => {
                const updatedFiles = [...formik.values.ooc_copies];
                updatedFiles.splice(index, 1);
                formik.setFieldValue("ooc_copies", updatedFiles);
              }}
            />
          </Box>

          <Box>
            <FileUpload
              label="Customs Gate Pass Copy"
              bucketPath="gate_pass_copies"
              onFilesUploaded={(newFiles) =>
                formik.setFieldValue("gate_pass_copies", [...(formik.values.gate_pass_copies || []), ...newFiles])
              }
              multiple
            />
            <ImagePreview
              images={formik.values.gate_pass_copies || []}
              onDeleteImage={(index) => {
                const updatedFiles = [...formik.values.gate_pass_copies];
                updatedFiles.splice(index, 1);
                formik.setFieldValue("gate_pass_copies", updatedFiles);
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ImportTermsSection;
