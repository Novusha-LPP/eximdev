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
  const [customHouse, setCustomHouse] = useState("");
  const [importer, setImporter] = useState("");
  const [shippingLine, setShippingLine] = useState("");
  const [branchSrNo, setBranchSrNo] = useState("");
  const [adCode, setAdCode] = useState("");
  const [exporterSupplier, setExporterSupplier] = useState("");
  const [blNumber, setBlNumber] = useState("");
  const [typeOf_BE, setTypeOf_BE] = useState("");
  const [loadingPort, setLoadingPort] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [blDate, setBlDate] = useState("");
  const [cth_no, setcth_no] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [portOfReporting, setPortOfReporting] = useState("");
  const [totalInvValue, setTotalInvValue] = useState("");
  const [invCurrency, setInvCurrency] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [fclOrLcl, setFclOrLcl] = useState("");
  const [isDraftDoc, setIsDraftDoc] = useState(false);
  const [containers, setContainers] = useState([{ number: "", size: "" }]);
  const [isBenefit, setIsBenefit] = useState(false);
  const [dateTime, setDateTime] = useState(null);
  const [exBondValue, setExBondValue] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [clearanceValue, setClearanceValue] = useState("");
  const [deleteIndex, setDeleteIndex] = useState(null);

  const [otherDetails, setOtherDetails] = useState({
    beNumber: "",
    beDate: "",
    scheme: "",
    beCopy: null,
  });

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
          customHouse,
          importer,
          shippingLine,
          branchSrNo,
          adCode,
          exporterSupplier,
          blNumber,
          typeOf_BE,
          loadingPort,
          grossWeight,
          blDate,
          cth_no,
          originCountry,
          portOfReporting,
          totalInvValue,
          invCurrency,
          invoiceNumber,
          invoiceDate,
          description,
          fclOrLcl,
          isDraftDoc,
          containers,
          cthDocuments,
        };
        console.log(payload)
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

  // Container handlers
  const handleAddContainer = () => {
    setContainers([...containers, { number: "", size: "" }]);
  };

  const handleRemoveContainer = (index) => {
    const updatedContainers = containers.filter((_, i) => i !== index);
    setContainers(updatedContainers);
  };

  const handleContainerChange = (index, field, value) => {
    const updatedContainers = [...containers];
    updatedContainers[index][field] = value;
    setContainers(updatedContainers);
  };
  // Document handlers
  const handleAddDocument = () => {
    if (selectedDocument === "other") {
      if (newDocumentName && newDocumentCode) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          {
            document_name: newDocumentName,
            document_code: newDocumentCode,
            url: [],
            isDefault: false,
          },
        ]);
        setNewDocumentName("");
        setNewDocumentCode("");
      }
    } else {
      const selectedDoc = cth_Dropdown.find(
        (doc) => doc.document_code === selectedDocument
      );
      if (selectedDoc) {
        setCthDocuments((prevDocs) => [
          ...prevDocs,
          { ...selectedDoc, url: [], isDefault: false },
        ]);
      }
    }
    setSelectedDocument("");
  };

  const handleDeleteDocument = () => {
    if (deleteIndex !== null) {
      setCthDocuments((prevDocs) =>
        prevDocs.filter((_, i) => i !== deleteIndex)
      );
      setDeleteIndex(null);
      setConfirmDialogOpen(false);
    }
  };

  const confirmDeleteDocument = (index) => {
    setDeleteIndex(index);
    setConfirmDialogOpen(true);
  };

  const handleOpenEditDialog = (index) => {
    setEditValues(cthDocuments[index]);
    setEditDialogOpen(true);
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

  return {
    formik,
    customHouse,
    setCustomHouse,
    importer,
    setImporter,
    shippingLine,
    setShippingLine,
    branchSrNo,
    setBranchSrNo,
    adCode,
    setAdCode,
    exporterSupplier,
    setExporterSupplier,
    blNumber,
    setBlNumber,
    typeOf_BE,
    setTypeOf_BE,
    loadingPort,
    setLoadingPort,
    grossWeight,
    setGrossWeight,
    blDate,
    setBlDate,
    cth_no,
    setcth_no,
    originCountry,
    setOriginCountry,
    portOfReporting,
    setPortOfReporting,
    totalInvValue,
    setTotalInvValue,
    invCurrency,
    setInvCurrency,
    invoiceNumber,
    setInvoiceNumber,
    invoiceDate,
    setInvoiceDate,
    description,
    setDescription,
    fclOrLcl,
    setFclOrLcl,
    isDraftDoc,
    setIsDraftDoc,
    containers,
    handleAddContainer,
    handleRemoveContainer,
    handleContainerChange,
    cthDocuments,
    setCthDocuments,
    handleAddDocument,
    handleDeleteDocument,
    confirmDeleteDocument,
    handleOpenEditDialog,
    handleSaveEdit,
    confirmDialogOpen,
    setConfirmDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editValues,
    setEditValues,
    isBenefit,
    setIsBenefit,
    dateTime,
    setDateTime,
    otherDetails,
    setOtherDetails,
    exBondValue,
    setExBondValue,
    selectedDocument,
    setSelectedDocument,
    newDocumentCode,
    setNewDocumentCode,
    newDocumentName,
    setNewDocumentName,
    clearanceValue,
    setClearanceValue,
    deleteIndex,
    setDeleteIndex,
  };
};

export default useImportJobForm;
