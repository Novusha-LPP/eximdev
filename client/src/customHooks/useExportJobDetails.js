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
    { charge_type: "Terminal Handling" },
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
    { document_name: "Insurance Certificate", document_code: "INS" },
  ];

  // Fetch export job data
  useEffect(() => {
    async function getExportJobDetails() {
      try {
        setLoading(true);

        console.log("Fetching export job details for:", params); // Debug log

        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`
        );

        console.log("Full API Response:", response); // Debug log
        console.log("Response data:", response.data); // Debug log

        // Handle different response structures
        let jobData = null;

        if (response.data) {
          if (response.data.success && response.data.data) {
            // Structure: { success: true, data: {...} }
            jobData = response.data.data;
          } else if (response.data.success === undefined && response.data._id) {
            // Direct job data without wrapper
            jobData = response.data;
          } else if (response.data.job_no || response.data._id) {
            // Direct job data
            jobData = response.data;
          }
        }

        console.log("Processed jobData:", jobData); // Debug log

        if (jobData) {
          setData(jobData);
          setExportDocuments(jobData.export_documents || []);

          // Update export charges to include custom charges from database
          if (jobData.export_charges && jobData.export_charges.length > 0) {
            const predefinedCharges = [
              { charge_type: "Ocean Freight" },
              { charge_type: "Documentation" },
              { charge_type: "Customs Clearance" },
              { charge_type: "Origin Handling" },
              { charge_type: "Terminal Handling" },
            ];

            // Merge database charges with predefined charges
            const mergedCharges = predefinedCharges.map((predefined) => {
              const dbCharge = jobData.export_charges.find(
                (charge) => charge.charge_type === predefined.charge_type
              );
              return dbCharge || predefined;
            });

            // Add any custom charges that aren't in predefined list
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
        }
      } catch (error) {
        console.error("Error fetching export job details:", error);
        console.error("Error details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        setData(null);
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

  // Debug log when data changes
  useEffect(() => {
    console.log("Data state changed:", data);
  }, [data]);

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
          "Content-Type": "application/json",
          "user-id": user.username || "unknown",
          username: user.username || "unknown",
          "user-role": user.role || "unknown",
        };

        // Prepare the update payload
        const updatePayload = {
          ...values,
          export_documents: exportDocuments,
          export_charges: exportCharges,
          containers: values.containers,
          updatedAt: new Date(),
        };

        console.log("Submitting update payload:", updatePayload); // Debug log

        const response = await axios.put(
          `${process.env.REACT_APP_API_STRING}/export-jobs/${params.year}/${params.job_no}`,
          updatePayload,
          { headers }
        );

        console.log("Update response:", response.data); // Debug log

        if (setFileSnackbar) {
          setFileSnackbar(true);
          setTimeout(() => setFileSnackbar(false), 3000);
        }

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
      console.log("Setting formik values with data:", data); // Debug log

      // Use containers to match your schema
      const containers = safeValue(data.containers).map((container) => ({
        container_number: safeValue(container.container_number),
        size: safeValue(container.size, "20"), // Use 'size' to match schema
        seal_number: safeValue(container.seal_number),
        arrival_date: safeValue(container.arrival_date),
        physical_weight: safeValue(container.physical_weight),
        tare_weight: safeValue(container.tare_weight),
        net_weight: safeValue(container.net_weight),
        container_gross_weight: safeValue(container.container_gross_weight),
        actual_weight: safeValue(container.actual_weight),
        transporter: safeValue(container.transporter),
        vehicle_no: safeValue(container.vehicle_no),
        driver_name: safeValue(container.driver_name),
        driver_phone: safeValue(container.driver_phone),
        seal_no: safeValue(container.seal_no),
        weighment_slip_images: safeValue(container.weighment_slip_images, []),
        container_images: safeValue(container.container_images, []),
        container_pre_damage_images: safeValue(
          container.container_pre_damage_images,
          []
        ),
        loose_material: safeValue(container.loose_material, []),
        examination_videos: safeValue(container.examination_videos, []),
        delivery_date: safeValue(container.delivery_date),
        container_rail_out_date: safeValue(container.container_rail_out_date),
        by_road_movement_date: safeValue(container.by_road_movement_date),
        emptyContainerOffLoadDate: safeValue(
          container.emptyContainerOffLoadDate
        ),
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
        documentation_completion_date: safeValue(
          data.documentation_completion_date
        ),
        customs_clearance_date: safeValue(data.customs_clearance_date),
        stuffing_date: safeValue(data.stuffing_date),
        gate_pass_date: safeValue(data.gate_pass_date),
        port_terminal_arrival_date: safeValue(data.port_terminal_arrival_date),
        loading_completion_date: safeValue(data.loading_completion_date),
        vessel_departure_date: safeValue(data.vessel_departure_date),

        // Use containers to match schema
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
    setData,
  };
}

export default useExportJobDetails;
