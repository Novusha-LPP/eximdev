import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";

const handleSingleFileUpload = async (file, folderName, setFileSnackbar) => {
  try {
    const key = `${folderName}/${file.name}`;

    const s3 = new AWS.S3({
      accessKeyId: process.env.REACT_APP_ACCESS_KEY,
      secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
      region: "ap-south-1",
    });

    const params = {
      Bucket: process.env.REACT_APP_S3_BUCKET,
      Key: key,
      Body: file,
    };

    const data = await s3.upload(params).promise();
    const photoUrl = data.Location;

    setFileSnackbar(true);
    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);

    return photoUrl;
  } catch (err) {
    console.error("Error uploading file:", err);
  }
};

function useExportJobDetails(params, setFileSnackbar) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Default export documents that should always be shown
  const [exportDocuments, setExportDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
      url: [],
      document_number: "",
      issue_date: "",
      is_verified: false,
    },
    {
      document_name: "Packing List",
      document_code: "271000",
      url: [],
      document_number: "",
      issue_date: "",
      is_verified: false,
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
      url: [],
      document_number: "",
      issue_date: "",
      is_verified: false,
    },
  ]);

  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");

  // Export charges
  const [exportCharges, setExportCharges] = useState([
    { charge_type: "Ocean Freight" },
    { charge_type: "Documentation" },
    { charge_type: "Customs Clearance" },
    { charge_type: "Origin Handling" },
    { charge_type: "Terminal Handling" },
  ]);

  // Export document dropdown (excluding the default ones)
  const exportDocDropdown = [
    { document_name: "Certificate of Origin", document_code: "COO" },
    { document_name: "Export License", document_code: "EXLIC" },
    { document_name: "Shipping Bill", document_code: "SB" },
    { document_name: "Letter of Credit", document_code: "LC" },
    { document_name: "Quality Certificate", document_code: "QC" },
    { document_name: "Phytosanitary Certificate", document_code: "PHYTO" },
    { document_name: "Insurance Certificate", document_code: "INS" },
  ];

  // Default documents that should always be present
  const defaultDocuments = [
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
    },
    {
      document_name: "Packing List",
      document_code: "271000",
    },
    {
      document_name: "Bill of Lading",
      document_code: "704000",
    },
  ];

  // Function to check if a document can be edited or deleted
  const canEditOrDelete = (doc) => {
    return !defaultDocuments.some(
      (defaultDoc) =>
        defaultDoc.document_name === doc.document_name &&
        defaultDoc.document_code === doc.document_code
    );
  };

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);

        console.log("Fetching export job details for:", params);

        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`
        );

        console.log("Full API Response:", response);
        console.log("Response data:", response.data);

        let jobData = null;

        if (response.data) {
          if (response.data.success && response.data.data) {
            jobData = response.data.data;
          } else if (response.data.success === undefined && response.data._id) {
            jobData = response.data;
          } else if (response.data.job_no || response.data._id) {
            jobData = response.data;
          }
        }

        console.log("Processed jobData:", jobData);

        if (jobData) {
          setData(jobData);

          // Merge default documents with database documents
          const dbDocuments = jobData.export_documents || [];
          
          // Start with default documents
          const mergedDocuments = [...defaultDocuments];
          
          // Merge data from database for default documents
          mergedDocuments.forEach((defaultDoc, index) => {
            const dbDoc = dbDocuments.find(
              (doc) => doc.document_code === defaultDoc.document_code
            );
            if (dbDoc) {
              mergedDocuments[index] = {
                ...defaultDoc,
                url: dbDoc.url || [],
                document_number: dbDoc.document_number || "",
                issue_date: dbDoc.issue_date || "",
                is_verified: dbDoc.is_verified || false,
                verification_date: dbDoc.verification_date || "",
              };
            } else {
              mergedDocuments[index] = {
                ...defaultDoc,
                url: [],
                document_number: "",
                issue_date: "",
                is_verified: false,
                verification_date: "",
              };
            }
          });

          // Add any additional documents from database that aren't in defaults
          dbDocuments.forEach((dbDoc) => {
            if (!defaultDocuments.some((defaultDoc) => defaultDoc.document_code === dbDoc.document_code)) {
              mergedDocuments.push(dbDoc);
            }
          });

          setExportDocuments(mergedDocuments);

          // Update export charges
          if (jobData.export_charges && jobData.export_charges.length > 0) {
            const predefinedCharges = [
              { charge_type: "Ocean Freight" },
              { charge_type: "Documentation" },
              { charge_type: "Customs Clearance" },
              { charge_type: "Origin Handling" },
              { charge_type: "Terminal Handling" },
            ];

            const mergedCharges = predefinedCharges.map((predefined) => {
              const dbCharge = jobData.export_charges.find(
                (charge) => charge.charge_type === predefined.charge_type
              );
              return dbCharge || predefined;
            });

            const customCharges = jobData.export_charges.filter(
              (charge) =>
                !predefinedCharges.some(
                  (predefined) => predefined.charge_type === charge.charge_type
                )
            );

            setExportCharges([...mergedCharges, ...customCharges]);
          }
        } else {
          console.error("No valid job data found in response");
          setData(null);
          // Keep default documents even if no data
          const defaultDocsWithEmptyFields = defaultDocuments.map(doc => ({
            ...doc,
            url: [],
            document_number: "",
            issue_date: "",
            is_verified: false,
            verification_date: "",
          }));
          setExportDocuments(defaultDocsWithEmptyFields);
        }
      } catch (error) {
        console.error("Error fetching export job details:", error);
        setData(null);
        // Keep default documents even on error
        const defaultDocsWithEmptyFields = defaultDocuments.map(doc => ({
          ...doc,
          url: [],
          document_number: "",
          issue_date: "",
          is_verified: false,
          verification_date: "",
        }));
        setExportDocuments(defaultDocsWithEmptyFields);
      } finally {
        setLoading(false);
      }
    }

    if (params.job_no && params.year) {
      getExportJobDetails();
    } else {
      console.warn("Missing required parameters:", params);
      setLoading(false);
    }
  }, [params.job_no, params.year]);

  // Rest of your existing code remains the same...
  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;

  const formik = useFormik({
    initialValues: {
      // Basic job info
      job_type: "sea_export",
      status: "Planning",
      detailed_status: "Planning Stage",
      priority_level: "Normal",

      // Exporter info
      exporter_name: "",
      ie_code: "",

      // Consignee info
      consignee_name: "",
      consignee_country: "",

      // Shipment details
      port_of_loading: "",
      port_of_discharge: "",
      vessel_flight_name: "",
      booking_number: "",

      // Commercial details
      commercial_invoice_number: "",
      commercial_invoice_date: "",
      commercial_invoice_value: "",
      incoterms: "",

      // Shipping bill details
      shipping_bill_number: "",
      shipping_bill_date: "",
      leo_number: "",

      // Milestone dates
      booking_confirmation_date: "",
      documentation_completion_date: "",
      customs_clearance_date: "",
      stuffing_date: "",
      gate_pass_date: "",
      port_terminal_arrival_date: "",
      loading_completion_date: "",
      vessel_departure_date: "",

      // Containers
      containers: [{
        container_number: "",
        container_size: "20",
        seal_number: "",
        stuffing_date: "",
        gross_weight: "",
        net_weight: "",
        gate_in_date: "",
        loading_date: "",
        container_images: [],
        stuffing_images: []
      }],

      // Other fields
      remarks: "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        const updatePayload = {
          ...values,
          export_documents: exportDocuments,
          export_charges: exportCharges,
          containers: values.containers,
          updatedAt: new Date(),
        };

        console.log("Submitting update payload:", updatePayload);

        const response = await axios.put(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
          updatePayload,
          { headers }
        );

        console.log("Update response:", response.data);

        if (setFileSnackbar) {
          setFileSnackbar(true);
          setTimeout(() => setFileSnackbar(false), 3000);
        }

        setTimeout(() => {
          window.close();
        }, 500);
      } catch (error) {
        console.error("Error updating export job:", error);
        throw error;
      }
    },
  });

  // Update formik initial values when data is fetched
  useEffect(() => {
    if (data) {
      console.log("Setting formik values with data:", data);

      const containers = safeValue(data.containers, []).map((container) => ({
        container_number: safeValue(container.container_number),
        container_size: safeValue(container.container_size || container.size, "20"),
        seal_number: safeValue(container.seal_number),
        stuffing_date: safeValue(container.stuffing_date),
        gross_weight: safeValue(container.gross_weight),
        net_weight: safeValue(container.net_weight),
        gate_in_date: safeValue(container.gate_in_date),
        loading_date: safeValue(container.loading_date),
        container_images: safeValue(container.container_images, []),
        stuffing_images: safeValue(container.stuffing_images, []),
        // Add other container fields as needed
      }));

      formik.setValues({
        // Basic job info
        job_type: safeValue(data.job_type, "sea_export"),
        status: safeValue(data.status, "Planning"),
        detailed_status: safeValue(data.detailed_status, "Planning Stage"),
        priority_level: safeValue(data.priority_level, "Normal"),

        // Exporter info
        exporter_name: safeValue(data.exporter_name),
        ie_code: safeValue(data.ie_code),

        // Consignee info
        consignee_name: safeValue(data.consignee_name),
        consignee_country: safeValue(data.consignee_country),

        // Shipment details
        port_of_loading: safeValue(data.port_of_loading),
        port_of_discharge: safeValue(data.port_of_discharge),
        vessel_flight_name: safeValue(data.vessel_flight_name),
        booking_number: safeValue(data.booking_number),

        // Commercial details
        commercial_invoice_number: safeValue(data.commercial_invoice_number),
        commercial_invoice_date: safeValue(data.commercial_invoice_date),
        commercial_invoice_value: safeValue(data.commercial_invoice_value),
        incoterms: safeValue(data.incoterms),

        // Shipping bill details
        shipping_bill_number: safeValue(data.shipping_bill_number),
        shipping_bill_date: safeValue(data.shipping_bill_date),
        leo_number: safeValue(data.leo_number),

        // Milestone dates
        booking_confirmation_date: safeValue(data.booking_confirmation_date),
        documentation_completion_date: safeValue(data.documentation_completion_date),
        customs_clearance_date: safeValue(data.customs_clearance_date),
        stuffing_date: safeValue(data.stuffing_date),
        gate_pass_date: safeValue(data.gate_pass_date),
        port_terminal_arrival_date: safeValue(data.port_terminal_arrival_date),
        loading_completion_date: safeValue(data.loading_completion_date),
        vessel_departure_date: safeValue(data.vessel_departure_date),

        // Containers
        containers: containers.length > 0 ? containers : [{
          container_number: "",
          container_size: "20",
          seal_number: "",
          stuffing_date: "",
          gross_weight: "",
          net_weight: "",
          gate_in_date: "",
          loading_date: "",
          container_images: [],
          stuffing_images: []
        }],

        // Other fields
        remarks: safeValue(data.remarks),
      });
    }
  }, [data]);

  // File upload handler
  const handleFileChange = async (event, documentName, index, isExport) => {
    const file = event.target.files[0];
    if (!file) return;

    const formattedDocumentName = documentName
      .toLowerCase()
      .replace(/\[.*?\]|\(.*?\)/g, "")
      .replace(/[^\w\s]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    const photoUrl = await handleSingleFileUpload(
      file,
      formattedDocumentName,
      setFileSnackbar
    );

    if (isExport && photoUrl) {
      const updatedDocs = [...exportDocuments];
      if (!updatedDocs[index].url) {
        updatedDocs[index].url = [];
      }
      updatedDocs[index].url.push(photoUrl);
      setExportDocuments(updatedDocs);
    }
  };

  return {
    data,
    loading,
    formik,
    exportDocuments,
    setExportDocuments,
    exportCharges,
    setExportCharges,
    exportDocDropdown,
    selectedDocument,
    setSelectedDocument,
    newDocumentName,
    setNewDocumentName,
    newDocumentCode,
    setNewDocumentCode,
    handleFileChange,
    canEditOrDelete, // Export this function for use in components
    setData,
  };
}

export default useExportJobDetails;
