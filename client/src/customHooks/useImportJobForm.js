import { useState } from "react";
import { useFormik } from "formik";
import axios from "axios";
import {
  customHouseOptions,
  importerOptions,
  shippingLineOptions,
  cth_Dropdown,
} from "../components/MasterLists/MasterLists";

const useImportJobForm = () => {
  // State variables for form fields and UI controls
  const [job_no, setJobNo] = useState("");
  const [custom_house, setCustomHouse] = useState("");
  const [importer, setImporter] = useState("");
  const [shipping_line_airline, setShippingLineAirline] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [supplier_exporter, setSupplierExporter] = useState("");
  const [awb_bl_no, setAwbBlNo] = useState("");
  const [awb_bl_date, setAwbBlDate] = useState("");
  const [type_of_b_e, setTypeOfBE] = useState("");
  const [loading_port, setLoadingPort] = useState("");
  const [gross_weight, setGrossWeight] = useState("");
  const [cth_no, setCthNo] = useState("");
  const [origin_country, setOriginCountry] = useState("");
  const [port_of_reporting, setPortOfReporting] = useState("");
  const [total_inv_value, setTotalInvValue] = useState("");
  const [inv_currency, setInvCurrency] = useState("");
  const [invoice_number, setInvoiceNumber] = useState("");
  const [invoice_date, setInvoiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [consignment_type, setConsignmentType] = useState("");
  const [isDraftDoc, setIsDraftDoc] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [container_nos, setContainerNos] = useState([
    {
      container_number: "",
      size: "",
    },
  ]);
  const [fta_Benefit_date_time, setFtaBenefitDateTime] = useState("");
  const [exBondValue, setExBondValue] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [be_no, setBeNo] = useState("");
  const [be_date, setBeDate] = useState("");
  const [ooc_copies, setOocCopies] = useState([]);
  const [scheme, setScheme] = useState("");
  const [clearanceValue, setClearanceValue] = useState("");

  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      isDefault: true,
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
      url: [],
      isDefault: true,
    },
  ]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  // Formik initialization for form submission handling
  const formik = useFormik({
    initialValues: {
      all_documents: [],
    },
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          job_no,
          custom_house,
          importer,
          shipping_line_airline,
          branchSrNo,
          adCode,
          supplier_exporter,
          awb_bl_no,
          awb_bl_date,
          type_of_b_e,
          loading_port,
          gross_weight,
          cth_no,
          origin_country,
          port_of_reporting,
          total_inv_value,
          inv_currency,
          invoice_number,
          invoice_date,
          description,
          consignment_type,
          isDraftDoc,
          container_nos,
          cthDocuments,
        };
        console.log(payload);
        // await axios.post(
        //   `${process.env.REACT_APP_API_STRING}/jobs/add-job`,
        //   payload
        // );
        alert("Job successfully created!");
      } catch (error) {
        console.error("Error creating job", error);
        alert("Failed to create job. Please try again.");
      }
    },
  });
  const resetOtherDetails = () => {
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setScheme("");
    setExBondValue(""); // Reset this if it's part of the same context
  };
  const canChangeClearance = () => {
    return (
      !exBondValue && !be_no && !be_date && !scheme && ooc_copies.length === 0
    );
  };

  const handleOpenEditDialog = (index) => {
    const documentToEdit = cthDocuments[index];
    setEditValues(documentToEdit);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditValues({});
  };

  // Container handlers
  const handleAddContainer = () => {
    setContainerNos([...container_nos, { container_number: "", size: "" }]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = container_nos.filter((_, i) => i !== index);
    setContainerNos(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...container_nos];
    updatedContainers[index][field] = value;
    setContainerNos(updatedContainers);
  };

  // Document handlers
  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      // Adding a custom document
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      } else {
        alert("Please enter valid document details.");
      }
    } else if (selectedDocument) {
      // Adding a document from the dropdown
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );

      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [] },
        ]);
        setSelectedDocument("");
      } else {
        alert("Invalid document selected.");
      }
    } else {
      alert("Please select or enter document details.");
    }
  };
  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    updatedDocuments[
      cthDocuments.findIndex(
        (doc) => doc.document_code === editValues.document_code
      )
    ] = editValues;
    setCthDocuments(updatedDocuments);
    setEditDialogOpen(false);
  };
  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      console.log("Deleting document at index:", deleteIndex);
      setCthDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((_, i) => i !== deleteIndex);
        console.log("Updated Documents:", updatedDocs);
        return updatedDocs;
      });
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    } else {
      console.error("No document selected for deletion.");
    }
  };

  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };
  const handleEditDocument = (index, field, value) => {
    const updatedDocuments = [...cthDocuments];
    updatedDocuments[index][field] = value;
    setCthDocuments(updatedDocuments);
  };

  return {
    formik,
    job_no,
    setJobNo,
    custom_house,
    setCustomHouse,
    importer,
    setImporter,
    shipping_line_airline,
    setShippingLineAirline,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    supplier_exporter,
    setSupplierExporter,
    awb_bl_no,
    setAwbBlNo,
    awb_bl_date,
    setAwbBlDate,
    type_of_b_e,
    setTypeOfBE,
    loading_port,
    setLoadingPort,
    gross_weight,
    setGrossWeight,
    cth_no,
    setCthNo,
    origin_country,
    setOriginCountry,
    port_of_reporting,
    setPortOfReporting,
    total_inv_value,
    setTotalInvValue,
    inv_currency,
    setInvCurrency,
    invoice_number,
    setInvoiceNumber,
    invoice_date,
    setInvoiceDate,
    description,
    setDescription,
    consignment_type,
    setConsignmentType,
    isDraftDoc,
    setIsDraftDoc,
    container_nos,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    handleAddDocument,
    handleDeleteDocument,
    handleEditDocument,
    ooc_copies,
    setOocCopies,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveEdit,
    confirmDeleteDocument,
    confirmDialogOpen,
    clearanceValue,
    setClearanceValue,
    be_no,
    setBeNo,
    be_date,
    setBeDate,
    scheme,
    setScheme,
    resetOtherDetails,
    canChangeClearance,
    exBondValue,
    setExBondValue,
  };
};

export default useImportJobForm;
