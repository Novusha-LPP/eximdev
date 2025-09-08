import React from 'react';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Description as DocumentIcon,
  AccountBalance as BankIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import FileUpload from './FileUpload';

const validationSchema = Yup.object({
  organization: Yup.string().required('Organization is required'),
  alias: Yup.string().required('Alias is required'),
  approvalStatus: Yup.string().required('Approval Status is required'),
  generalInfo: Yup.object({
    entityType: Yup.string().required('Entity Type is required'),
    companyName: Yup.string().required('Company Name is required'),
    msmeRegistered: Yup.boolean()
  }),
  address: Yup.object({
    addressLine: Yup.string().required('Address is required'),
    postalCode: Yup.string().required('Postal Code is required'),
    telephone: Yup.string(),
    fax: Yup.string(),
    email: Yup.string().email('Invalid email')
  }),
  registrationDetails: Yup.object({
    binNo: Yup.string(),
    ieCode: Yup.string().required('IE Code is required'),
    panNo: Yup.string().required('PAN No is required'),
    gstinMainBranch: Yup.string(),
    gstinBranchCodeFree: Yup.string(),
    gstinBranchCode15: Yup.string()
  })
});

const DirectoryForm = ({ directory, onSave, onCancel, readOnly = false }) => {
  const initialValues = {
    organization: directory?.organization || '',
    alias: directory?.alias || '',
    approvalStatus: directory?.approvalStatus || 'Pending',
    generalInfo: {
      entityType: directory?.generalInfo?.entityType || '',
      companyName: directory?.generalInfo?.companyName || '',
      msmeRegistered: directory?.generalInfo?.msmeRegistered || false
    },
    address: {
      addressLine: directory?.address?.addressLine || '',
      postalCode: directory?.address?.postalCode || '',
      telephone: directory?.address?.telephone || '',
      fax: directory?.address?.fax || '',
      email: directory?.address?.email || ''
    },
    registrationDetails: {
      binNo: directory?.registrationDetails?.binNo || '',
      ieCode: directory?.registrationDetails?.ieCode || '',
      panNo: directory?.registrationDetails?.panNo || '',
      gstinMainBranch: directory?.registrationDetails?.gstinMainBranch || '',
      gstinBranchCodeFree: directory?.registrationDetails?.gstinBranchCodeFree || '',
      gstinBranchCode15: directory?.registrationDetails?.gstinBranchCode15 || ''
    },
    kycDocuments: {
      certificateOfIncorporation: {
        uploaded: directory?.kycDocuments?.certificateOfIncorporation?.uploaded || false,
        files: directory?.kycDocuments?.certificateOfIncorporation?.files || []
      },
      memorandumOfAssociation: {
        uploaded: directory?.kycDocuments?.memorandumOfAssociation?.uploaded || false,
        files: directory?.kycDocuments?.memorandumOfAssociation?.files || []
      },
      articlesOfAssociation: {
        uploaded: directory?.kycDocuments?.articlesOfAssociation?.uploaded || false,
        files: directory?.kycDocuments?.articlesOfAssociation?.files || []
      },
      powerOfAttorney: {
        uploaded: directory?.kycDocuments?.powerOfAttorney?.uploaded || false,
        files: directory?.kycDocuments?.powerOfAttorney?.files || []
      },
      copyOfPanAllotment: {
        uploaded: directory?.kycDocuments?.copyOfPanAllotment?.uploaded || false,
        files: directory?.kycDocuments?.copyOfPanAllotment?.files || []
      },
      copyOfTelephoneBill: {
        uploaded: directory?.kycDocuments?.copyOfTelephoneBill?.uploaded || false,
        files: directory?.kycDocuments?.copyOfTelephoneBill?.files || []
      },
      gstRegistrationCopy: {
        uploaded: directory?.kycDocuments?.gstRegistrationCopy?.uploaded || false,
        files: directory?.kycDocuments?.gstRegistrationCopy?.files || []
      },
      balanceSheet: {
        uploaded: directory?.kycDocuments?.balanceSheet?.uploaded || false,
        files: directory?.kycDocuments?.balanceSheet?.files || []
      }
    },
    branchInfo: directory?.branchInfo || [{
      branchCode: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    }],
    aeoDetails: {
      aeoCode: directory?.aeoDetails?.aeoCode || '',
      aeoCountry: directory?.aeoDetails?.aeoCountry || 'India',
      aeoRole: directory?.aeoDetails?.aeoRole || ''
    },
    billingCurrency: {
      defaultCurrency: directory?.billingCurrency?.defaultCurrency || 'INR',
      defaultBillTypes: directory?.billingCurrency?.defaultBillTypes || []
    },
    authorizedSignatory: directory?.authorizedSignatory || [{
      name: '',
      designation: '',
      mobile: '',
      email: ''
    }],
    customHouse: directory?.customHouse || [{
      name: '',
      location: '',
      code: '',
      linkedStatus: 'Not Linked'
    }],
    accountCreditInfo: {
      creditLimit: directory?.accountCreditInfo?.creditLimit || '',
      unlimitedEnabled: directory?.accountCreditInfo?.unlimitedEnabled || false,
      creditPeriod: directory?.accountCreditInfo?.creditPeriod || ''
    },
    bankDetails: directory?.bankDetails || [{
      entityName: '',
      branchLocation: '',
      accountNumber: '',
      adCode: '',
      isDefault: false
    }],
    affiliateBranches: directory?.affiliateBranches || [{
      branchCode: '',
      branchName: ''
    }],
    notes: directory?.notes || ''
  };

  const handleSubmit = (values) => {
    onSave(values);
  };

  const handleFileUpload = (documentType, files, setFieldValue) => {
    setFieldValue(`kycDocuments.${documentType}.files`, files);
    setFieldValue(`kycDocuments.${documentType}.uploaded`, files.length > 0);
  };

  const handleFileDelete = (documentType, fileIndex, values, setFieldValue) => {
    const updatedFiles = values.kycDocuments[documentType].files.filter((_, index) => index !== fileIndex);
    setFieldValue(`kycDocuments.${documentType}.files`, updatedFiles);
    setFieldValue(`kycDocuments.${documentType}.uploaded`, updatedFiles.length > 0);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
        <Form>
          <Box sx={{ maxHeight: '75vh', overflow: 'auto', p: 3 }}>
            <Grid container spacing={3}>
              
              {/* Organization Information */}
              <Grid item xs={12}>
                <Accordion defaultExpanded>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="primary" />
                      <Typography variant="h6">Organization Information</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="organization"
                          label="Organization Name *"
                          value={values.organization}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.organization && !!errors.organization}
                          helperText={touched.organization && errors.organization}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="alias"
                          label="Alias *"
                          value={values.alias}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.alias && !!errors.alias}
                          helperText={touched.alias && errors.alias}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Approval Status *</InputLabel>
                          <Select
                            name="approvalStatus"
                            value={values.approvalStatus}
                            onChange={handleChange}
                            disabled={readOnly}
                          >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* General Information */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="primary" />
                      <Typography variant="h6">General Information (KYC)</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Entity Type *</InputLabel>
                          <Select
                            name="generalInfo.entityType"
                            value={values.generalInfo.entityType}
                            onChange={handleChange}
                            disabled={readOnly}
                          >
                            <MenuItem value="Company">Company</MenuItem>
                            <MenuItem value="Partnership">Partnership</MenuItem>
                            <MenuItem value="LLP">LLP</MenuItem>
                            <MenuItem value="Proprietorship">Proprietorship</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="generalInfo.companyName"
                          label="Company Name *"
                          value={values.generalInfo.companyName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="generalInfo.msmeRegistered"
                              checked={values.generalInfo.msmeRegistered}
                              onChange={handleChange}
                              disabled={readOnly}
                            />
                          }
                          label="MSME Registered"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Address */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="primary" />
                      <Typography variant="h6">Principal Place of Business</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          name="address.addressLine"
                          label="Address *"
                          value={values.address.addressLine}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="address.postalCode"
                          label="Postal Code *"
                          value={values.address.postalCode}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="address.telephone"
                          label="Telephone"
                          value={values.address.telephone}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="address.fax"
                          label="Fax"
                          value={values.address.fax}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="address.email"
                          label="Email"
                          type="email"
                          value={values.address.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={readOnly}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Documents (KYC Uploads) */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DocumentIcon color="primary" />
                      <Typography variant="h6">Documents (KYC Uploads)</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      {[
                        { key: 'certificateOfIncorporation', label: 'Certificate of Incorporation' },
                        { key: 'memorandumOfAssociation', label: 'Memorandum of Association' },
                        { key: 'articlesOfAssociation', label: 'Articles of Association' },
                        { key: 'powerOfAttorney', label: 'Power of Attorney' },
                        { key: 'copyOfPanAllotment', label: 'Copy of PAN Allotment' },
                        { key: 'copyOfTelephoneBill', label: 'Copy of Telephone Bill' },
                        { key: 'gstRegistrationCopy', label: 'GST Registration Copy' },
                        { key: 'balanceSheet', label: 'Balance Sheet' }
                      ].map((doc) => (
                        <Grid item xs={12} md={6} key={doc.key}>
                          <Paper sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {doc.label}
                            </Typography>
                            <FileUpload
                              label={`Upload ${doc.label}`}
                              onFilesUploaded={(files) => handleFileUpload(doc.key, files, setFieldValue)}
                              bucketPath={`kyc-documents/${doc.key}`}
                              multiple={false}
                              acceptedFileTypes={['.pdf', '.jpg', '.jpeg', '.png']}
                              readOnly={readOnly}
                              existingFiles={values.kycDocuments[doc.key].files}
                              onFileDeleted={(index) => handleFileDelete(doc.key, index, values, setFieldValue)}
                            />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Registration Details */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon color="primary" />
                      <Typography variant="h6">Registration Details</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.binNo"
                          label="BIN No"
                          value={values.registrationDetails.binNo}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.ieCode"
                          label="IE Code No *"
                          value={values.registrationDetails.ieCode}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.panNo"
                          label="PAN No *"
                          value={values.registrationDetails.panNo}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.gstinMainBranch"
                          label="GSTIN Main Branch"
                          value={values.registrationDetails.gstinMainBranch}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.gstinBranchCodeFree"
                          label="GSTIN Branch Code (0 - Free)"
                          value={values.registrationDetails.gstinBranchCodeFree}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="registrationDetails.gstinBranchCode15"
                          label="GSTIN Branch Code (15)"
                          value={values.registrationDetails.gstinBranchCode15}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Bank Details */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BankIcon color="primary" />
                      <Typography variant="h6">Bank / Dealer Information</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FieldArray name="bankDetails">
                      {({ push, remove }) => (
                        <Box>
                          {values.bankDetails.map((bank, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                              <CardHeader
                                title={`Bank ${index + 1}`}
                                action={
                                  !readOnly && (
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(index)}
                                      disabled={values.bankDetails.length === 1}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )
                                }
                              />
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`bankDetails[${index}].entityName`}
                                      label="Entity Name *"
                                      value={bank.entityName}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`bankDetails[${index}].branchLocation`}
                                      label="Branch Location *"
                                      value={bank.branchLocation}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`bankDetails[${index}].accountNumber`}
                                      label="Account Number *"
                                      value={bank.accountNumber}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`bankDetails[${index}].adCode`}
                                      label="AD Code *"
                                      value={bank.adCode}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          name={`bankDetails[${index}].isDefault`}
                                          checked={bank.isDefault}
                                          onChange={handleChange}
                                          disabled={readOnly}
                                        />
                                      }
                                      label="Set as Default"
                                    />
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => push({
                                entityName: '',
                                branchLocation: '',
                                accountNumber: '',
                                adCode: '',
                                isDefault: false
                              })}
                              variant="outlined"
                            >
                              Add Bank
                            </Button>
                          )}
                        </Box>
                      )}
                    </FieldArray>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Branch Information */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'rgba(44, 90, 160, 0.05)' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon color="primary" />
                      <Typography variant="h6">Branch Information</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FieldArray name="branchInfo">
                      {({ push, remove }) => (
                        <Box>
                          {values.branchInfo.map((branch, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                              <CardHeader
                                title={`Branch ${index + 1}`}
                                action={
                                  !readOnly && (
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(index)}
                                      disabled={values.branchInfo.length === 1}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )
                                }
                              />
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].branchCode`}
                                      label="Branch Code *"
                                      value={branch.branchCode}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].address`}
                                      label="Address *"
                                      value={branch.address}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={4}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].city`}
                                      label="City *"
                                      value={branch.city}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={4}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].state`}
                                      label="State *"
                                      value={branch.state}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={4}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].postalCode`}
                                      label="Postal Code *"
                                      value={branch.postalCode}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`branchInfo[${index}].country`}
                                      label="Country *"
                                      value={branch.country}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => push({
                                branchCode: '',
                                address: '',
                                city: '',
                                state: '',
                                postalCode: '',
                                country: 'India'
                              })}
                              variant="outlined"
                            >
                              Add Branch
                            </Button>
                          )}
                        </Box>
                      )}
                    </FieldArray>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* AEO Details */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">AEO Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="aeoDetails.aeoCode"
                          label="AEO Code"
                          value={values.aeoDetails.aeoCode}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="aeoDetails.aeoCountry"
                          label="AEO Country"
                          value={values.aeoDetails.aeoCountry}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="aeoDetails.aeoRole"
                          label="AEO Role"
                          value={values.aeoDetails.aeoRole}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Billing & Currency */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Billing & Currency</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <FormControl fullWidth>
                          <InputLabel>Default Currency</InputLabel>
                          <Select
                            name="billingCurrency.defaultCurrency"
                            value={values.billingCurrency.defaultCurrency}
                            onChange={handleChange}
                            disabled={readOnly}
                          >
                            <MenuItem value="INR">INR</MenuItem>
                            <MenuItem value="USD">USD</MenuItem>
                            <MenuItem value="EUR">EUR</MenuItem>
                            <MenuItem value="GBP">GBP</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Authorized Signatory */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Authorized Signatory</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FieldArray name="authorizedSignatory">
                      {({ push, remove }) => (
                        <Box>
                          {values.authorizedSignatory.map((signatory, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                              <CardHeader
                                title={`Signatory ${index + 1}`}
                                action={
                                  !readOnly && (
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(index)}
                                      disabled={values.authorizedSignatory.length === 1}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )
                                }
                              />
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`authorizedSignatory[${index}].name`}
                                      label="Name"
                                      value={signatory.name}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`authorizedSignatory[${index}].designation`}
                                      label="Designation"
                                      value={signatory.designation}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`authorizedSignatory[${index}].mobile`}
                                      label="Mobile"
                                      value={signatory.mobile}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`authorizedSignatory[${index}].email`}
                                      label="Email"
                                      value={signatory.email}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => push({
                                name: '',
                                designation: '',
                                mobile: '',
                                email: ''
                              })}
                              variant="outlined"
                            >
                              Add Signatory
                            </Button>
                          )}
                        </Box>
                      )}
                    </FieldArray>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Custom House */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Custom House (Drawback Bank)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FieldArray name="customHouse">
                      {({ push, remove }) => (
                        <Box>
                          {values.customHouse.map((house, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                              <CardHeader
                                title={`Custom House ${index + 1}`}
                                action={
                                  !readOnly && (
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(index)}
                                      disabled={values.customHouse.length === 1}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )
                                }
                              />
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`customHouse[${index}].name`}
                                      label="Name"
                                      value={house.name}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`customHouse[${index}].location`}
                                      label="Location"
                                      value={house.location}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`customHouse[${index}].code`}
                                      label="Code"
                                      value={house.code}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <FormControl fullWidth>
                                      <InputLabel>Linked Status</InputLabel>
                                      <Select
                                        name={`customHouse[${index}].linkedStatus`}
                                        value={house.linkedStatus}
                                        onChange={handleChange}
                                        disabled={readOnly}
                                      >
                                        <MenuItem value="Linked">Linked</MenuItem>
                                        <MenuItem value="Not Linked">Not Linked</MenuItem>
                                      </Select>
                                    </FormControl>
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => push({
                                name: '',
                                location: '',
                                code: '',
                                linkedStatus: 'Not Linked'
                              })}
                              variant="outlined"
                            >
                              Add Custom House
                            </Button>
                          )}
                        </Box>
                      )}
                    </FieldArray>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Account & Credit Information */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Account & Credit Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="accountCreditInfo.creditLimit"
                          label="Credit Limit"
                          type="number"
                          value={values.accountCreditInfo.creditLimit}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          name="accountCreditInfo.creditPeriod"
                          label="Credit Period (Days)"
                          type="number"
                          value={values.accountCreditInfo.creditPeriod}
                          onChange={handleChange}
                          disabled={readOnly}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              name="accountCreditInfo.unlimitedEnabled"
                              checked={values.accountCreditInfo.unlimitedEnabled}
                              onChange={handleChange}
                              disabled={readOnly}
                            />
                          }
                          label="Unlimited Credit"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Affiliate Branches */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Affiliate Branches</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <FieldArray name="affiliateBranches">
                      {({ push, remove }) => (
                        <Box>
                          {values.affiliateBranches.map((branch, index) => (
                            <Card key={index} sx={{ mb: 2 }}>
                              <CardHeader
                                title={`Affiliate Branch ${index + 1}`}
                                action={
                                  !readOnly && (
                                    <IconButton
                                      color="error"
                                      onClick={() => remove(index)}
                                      disabled={values.affiliateBranches.length === 1}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  )
                                }
                              />
                              <CardContent>
                                <Grid container spacing={2}>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`affiliateBranches[${index}].branchCode`}
                                      label="Branch Code"
                                      value={branch.branchCode}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      name={`affiliateBranches[${index}].branchName`}
                                      label="Branch Name"
                                      value={branch.branchName}
                                      onChange={handleChange}
                                      disabled={readOnly}
                                    />
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          ))}
                          {!readOnly && (
                            <Button
                              startIcon={<AddIcon />}
                              onClick={() => push({
                                branchCode: '',
                                branchName: ''
                              })}
                              variant="outlined"
                            >
                              Add Affiliate Branch
                            </Button>
                          )}
                        </Box>
                      )}
                    </FieldArray>
                  </AccordionDetails>
                </Accordion>
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Notes</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      name="notes"
                      label="Notes"
                      value={values.notes}
                      onChange={handleChange}
                      disabled={readOnly}
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

            </Grid>
          </Box>

          {!readOnly && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, p: 3, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
              <Button variant="outlined" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Save Directory
              </Button>
            </Box>
          )}
        </Form>
      )}
    </Formik>
  );
};

export default DirectoryForm;
