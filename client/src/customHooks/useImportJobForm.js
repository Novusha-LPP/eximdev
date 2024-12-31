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
  // NEW: Include a "year" field since backend checks it
  // const [year, setYear] = useState(new Date().getFullYear().toString());
  const [year, setYear] = useState("24-25");

  // Existing states:
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

  const [container_nos, setContainerNos] = useState([
    { container_number: "", size: "" },
  ]);

  const [fta_Benefit_date_time, setFtaBenefitDateTime] = useState("");
  const [exBondValue, setExBondValue] = useState("");

  // The back end expects "cth_documents". In your front end, you called it "cthDocuments".
  // Keep your internal state as is, but rename it in the final payload.
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

  const [scheme, setScheme] = useState("");
  const [be_no, setBeNo] = useState("");
  const [be_date, setBeDate] = useState("");
  const [ooc_copies, setOocCopies] = useState([]);
  const [clearanceValue, setClearanceValue] = useState("");

  const [deleteIndex, setDeleteIndex] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // For editing a single doc
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({});

  // For new doc from dropdown or user
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");

  //
  // Reset form function
  const resetForm = () => {
    setYear("24-25");
    setJobNo("");
    setCustomHouse("");
    setImporter("");
    setShippingLineAirline("");
    setBranchSrNo("");
    setAdCode("");
    setSupplierExporter("");
    setAwbBlNo("");
    setAwbBlDate("");
    setTypeOfBE("");
    setLoadingPort("");
    setGrossWeight("");
    setCthNo("");
    setOriginCountry("");
    setPortOfReporting("");
    setTotalInvValue("");
    setInvCurrency("");
    setInvoiceNumber("");
    setInvoiceDate("");
    setDescription("");
    setConsignmentType("");
    setIsDraftDoc(false);
    setContainerNos([{ container_number: "", size: "" }]);
    setFtaBenefitDateTime("");
    setExBondValue("");
    setCthDocuments([
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
    setScheme("");
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setClearanceValue("");
    setSelectedDocument("");
    setNewDocumentName("");
    setNewDocumentCode("");

    // Reset any other states if necessary
  };
  //
  // Formik init
  const formik = useFormik({
    initialValues: {
      // "all_documents" array from your schema
      all_documents: [],
    },
    onSubmit: async (values) => {
      try {
        // Construct payload with all required fields
        const payload = {
          ...values,
          year, // <-- MANDATORY for back end
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
          // Rename "cthDocuments" to "cth_documents" to match your route
          cth_documents: cthDocuments,
          scheme,
          be_no,
          be_date,
          ooc_copies,
          exBondValue,
          fta_Benefit_date_time,
          // Optional remarks or other fields you might want:
          remarks: "",
          status: "Pending",
        };

        console.log("Payload:", payload);

        // IMPORTANT: Make sure your route matches EXACTLY how your server is defined:
        // If your server uses `router.post("/api/jobs/add-job-imp-man", ...)`,
        // you either call: axios.post(`${BASE_URL}/api/jobs/add-job-imp-man`, payload)
        // or remove "/api" in the Express route.
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/jobs/add-job-imp-man`,
          payload
        );

        alert("Job successfully created!");
        // Reset the form after successful submission
        resetForm();
        formik.resetForm();
      } catch (error) {
        console.error("Error creating job", error);
        alert("Failed to create job. Please try again.");
      }
    },
  });

  // Example utility functions
  const resetOtherDetails = () => {
    setBeNo("");
    setBeDate("");
    setOocCopies([]);
    setScheme("");
    setExBondValue("");
  };

  const canChangeClearance = () => {
    return (
      !exBondValue && !be_no && !be_date && !scheme && ooc_copies.length === 0
    );
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

  // CTH Document handlers
  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) => {
        const updatedDocs = prevDocs.filter((_, i) => i !== deleteIndex);
        return updatedDocs;
      });
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
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

  const handleSaveEdit = () => {
    const updatedDocuments = [...cthDocuments];
    const idx = updatedDocuments.findIndex(
      (doc) => doc.document_code === editValues.document_code
    );
    if (idx !== -1) {
      updatedDocuments[idx] = editValues;
      setCthDocuments(updatedDocuments);
    }
    setEditDialogOpen(false);
  };

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

  return {
    formik,
    // Export states so the component can use them
    year,
    setYear,
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
    scheme,
    setScheme,
    be_no,
    setBeNo,
    be_date,
    setBeDate,
    ooc_copies,
    setOocCopies,
    exBondValue,
    setExBondValue,
    fta_Benefit_date_time,
    setFtaBenefitDateTime,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveEdit,
    confirmDeleteDocument,
    handleDeleteDocument,
    handleAddDocument,
    clearanceValue,
    setClearanceValue,
    resetOtherDetails,
    canChangeClearance,
  };
};

export default useImportJobForm;
