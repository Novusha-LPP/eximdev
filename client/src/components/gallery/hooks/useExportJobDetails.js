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

function useExportJobDetails(
  params,
  setFileSnackbar
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Export-specific documents
  const [exportDocuments, setExportDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");

  // Export charges
  const [exportCharges, setExportCharges] = useState([
    { charge_type: "Ocean Freight" },
    { charge_type: "Documentation" },
    { charge_type: "Customs Clearance" },
    { charge_type: "Origin Handling" },
    { charge_type: "Terminal Handling" }
  ]);

  // Export document dropdown
  const exportDocDropdown = [
    { document_name: "Commercial Invoice", document_code: "CINV" },
    { document_name: "Packing List", document_code: "PLIST" },
    { document_name: "Certificate of Origin", document_code: "COO" },
    { document_name: "Export License", document_code: "EXLIC" },
    { document_name: "Shipping Bill", document_code: "SB" },
    { document_name: "Bill of Lading", document_code: "BL" },
    { document_name: "Letter of Credit", document_code: "LC" },
    { document_name: "Quality Certificate", document_code: "QC" },
    { document_name: "Phytosanitary Certificate", document_code: "PHYTO" },
    { document_name: "Insurance Certificate", document_code: "INS" }
  ];

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`
        );
        
        if (response.data.success) {
          const jobData = response.data.data;
          setData(jobData);
          setExportDocuments(jobData.export_documents || []);
          
          // Update export charges to include custom charges from database
          if (jobData.export_charges && jobData.export_charges.length > 0) {
            const predefinedCharges = [
              { charge_type: "Ocean Freight" },
              { charge_type: "Documentation" },
              { charge_type: "Customs Clearance" },
              { charge_type: "Origin Handling" },
              { charge_type: "Terminal Handling" }
            ];
            
            // Get unique custom charges from database
            const customChargesFromDB = jobData.export_charges
              .filter(charge => !predefinedCharges.some(predefined => 
                predefined.charge_type === charge.charge_type))
              .map(charge => ({ charge_type: charge.charge_type }));
            
            // Remove duplicates
            const uniqueCustomCharges = customChargesFromDB.filter((charge, index, self) => 
              index === self.findIndex(c => c.charge_type === charge.charge_type)
            );
            
            // Combine predefined and unique custom charges
            const allCharges = [...predefinedCharges, ...uniqueCustomCharges];
            setExportCharges(allCharges);
          }
        }
      } catch (error) {
        console.error("Error fetching export job details:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    if (params.job_no && params.year) {
      getExportJobDetails();
    }
  }, [params.job_no, params.year]);

  // Utility function to handle undefined/null checks
  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;

  // Formik for export job
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
      containers: [],
      
      // Documents and charges (managed separately)
      export_documents: [],
      export_charges: [],
      
      // Queries
      export_queries: [],
      
      // Other fields
      remarks: "",
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        // Get user info for audit trail
        const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
        const headers = {
          'Content-Type': 'application/json',
          'user-id': user.username || 'unknown',
          'username': user.username || 'unknown',
          'user-role': user.role || 'unknown'
        };

        // Prepare the update payload
        const updatePayload = {
          ...values,
          export_documents: exportDocuments,
          export_charges: exportCharges,
          containers: values.containers,
          updatedAt: new Date()
        };

        await axios.put(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
          updatePayload,
          { headers }
        );

        // Close tab after successful submit
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
      const containers = safeValue(data.containers, []).map((container) => ({
        container_number: safeValue(container.container_number),
        container_size: safeValue(container.container_size, "20"),
        seal_number: safeValue(container.seal_number),
        stuffing_date: safeValue(container.stuffing_date),
        gross_weight: safeValue(container.gross_weight),
        net_weight: safeValue(container.net_weight),
        gate_in_date: safeValue(container.gate_in_date),
        loading_date: safeValue(container.loading_date),
        departure_date: safeValue(container.departure_date),
        container_images: safeValue(container.container_images, []),
        stuffing_images: safeValue(container.stuffing_images, []),
        weighment_slip: safeValue(container.weighment_slip, []),
        vgm_certificate: safeValue(container.vgm_certificate, []),
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
        containers,
        
        // Documents and charges
        export_documents: safeValue(data.export_documents, []),
        export_charges: safeValue(data.export_charges, []),
        
        // Queries
        export_queries: safeValue(data.export_queries, []),
        
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

    if (isExport) {
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
    setData
  };
}

export default useExportJobDetails;
