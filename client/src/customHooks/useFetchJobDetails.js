import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";
// import { Dropdown } from "react-bootstrap";

const handleSingleFileUpload = async (file, folderName, setFileSnackbar, shouldCompress = false) => {
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

function useFetchJobDetails(
  params,
  checked,
  setSelectedRegNo,
  setTabValue,
  setFileSnackbar,
  storedSearchParams
) {
  const [data, setData] = useState(null);
  const [detentionFrom, setDetentionFrom] = useState([]);
  const navigate = useNavigate();
  const [cthDocuments, setCthDocuments] = useState([
    {
      document_name: "Commercial Invoice",
      document_code: "380000",
    },
    {
      document_name: "Packing List",
      document_code: "271000",
    },
    {
      document_name: params.mode === "AIR" ? "Air Way BL" : "Bill of Lading",
      document_code: params.mode === "AIR" ? "740000" : "704000",
    },
  ]);

  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentCode, setNewDocumentCode] = useState("");
  //
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(""); // State for dropdown selection



  const additionalDocs = [
    // {
    //   document_name: "Pre-Shipment Inspection Certificate",
    //   document_code: "856001",
    // },
    // { document_name: "Form 9 & Form 6", document_code: "856001" },
    // {
    //   document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
    //   document_code: "101000",
    // },
    // { document_name: "Certificate of Analysis", document_code: "001000" },
  ];
  const cth_Dropdown = [

    {
      document_name: "Certificate of Origin",
      document_code: "861000",
    },
    {
      document_name: "Contract",
      document_code: "315000",
    },
    {
      document_name: "Insurance",
      document_code: "91WH13",
    },
    {
      document_name: "Pre-Shipment Inspection Certificate",
      document_code: "856001",
    },
    { document_name: "Form 9 & Form 6", document_code: "0856001" },
    {
      document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
      document_code: "101000",
    },
    { document_name: "Certificate of Analysis", document_code: "001000" },
  ];
  //
  // State variables for form values
  const [jobDetails, setJobDetails] = useState([]);

  const schemeOptions = ["Full Duty", "DEEC", "EPCG", "RODTEP", "ROSTL"];
  const beTypeOptions = ["Home", "In-Bond", "Ex-Bond"];
  const clearanceOptionsMapping = {
    Home: [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "EPCG", label: "EPCG" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
      { value: "TQ", label: "TQ" },
      { value: "SIL", label: "SIL" },
    ],
    "In-Bond": [{ value: "In-Bond", label: "In-Bond" }],
    "Ex-Bond": [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "EPCG", label: "EPCG" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
      { value: "TQ", label: "TQ" },
      { value: "SIL", label: "SIL" },
    ],
  };

  // Fetch job details for Ex-Bond details.
  useEffect(() => {
    async function fetchJobDetails() {
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_STRING}/jobs/add-job-all-In-bond`
        );
        setJobDetails(response.data);
      } catch (error) {
        console.error("Error fetching job details:", error);
      }
    }
    fetchJobDetails();
  }, []);

  const commonCthCodes = [
    "72041000",
    "72042920",
    "72042990",
    "72043000",
    "72044900",
    "72042190",
    "74040012",
    "74040022",
    "74040024",
    "74040025",
    "75030010",
    "76020010",
    "78020010",
    "79020010",
    "80020010",
    "81042010",
  ];

  const canEditOrDelete = (doc) => {
    return !(
      cthDocuments.some(
        (d) =>
          d.document_name === doc.document_name &&
          d.document_code === doc.document_code
      ) ||
      additionalDocs.some(
        (d) =>
          d.document_name === doc.document_name &&
          d.document_code === doc.document_code
      ) ||
      commonCthCodes.includes(formik.values.cth_no)
    );
  };

  // Fetch data
  useEffect(() => {
    async function getJobDetails() {
      const yearValue = params.selected_year || params.year;
      let url;
      if (params.branch_code && params.trade_type) {
        url = `${process.env.REACT_APP_API_STRING}/get-job/${params.branch_code}/${params.trade_type}/${params.mode}/${yearValue}/${params.job_no}`;
      } else {
        url = `${process.env.REACT_APP_API_STRING}/get-job/${params.mode}/${yearValue}/${params.job_no}`;
      }

      const response = await axios.get(url);
      setData(response.data);
      setSelectedDocuments(response.data.documents);
    }

    getJobDetails();
  }, [params.job_no, params.selected_year, params.year, params.mode, params.branch_code, params.trade_type]);

  // Fetch documents
  useEffect(() => {
    async function getDocuments() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-docs`
        );
        setDocuments(Array.isArray(res.data) ? res.data : []); // Ensure data is an array
      } catch (error) {
        console.error("Error fetching documents:", error);
        setDocuments([]); // Fallback to an empty array
      }
    }

    getDocuments();
  }, []);

  useEffect(() => {
    async function getCthDocs() {
      if (data?.cth_no) {
        try {
          // Handle multiple CTH numbers separated by " / "
          const cthNumbers = data.cth_no.split(' / ').map(cth => cth.trim());

          // Create query parameter string
          const queryParams = new URLSearchParams();
          cthNumbers.forEach(cth => queryParams.append('cth_nos', cth));

          const cthRes = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-cth-docs?${queryParams.toString()}`
          );

          // Rest of your existing logic...
          const fetchedCthDocuments =
            Array.isArray(cthRes.data) &&
            cthRes.data.map((cthDoc) => {
              const additionalData = data?.cth_documents.find(
                (doc) => doc.document_name === cthDoc.document_name
              );

              return {
                ...cthDoc,
                url: additionalData ? additionalData.url : "",
              };
            });

          // Continue with your existing merging logic...
          let documentsToMerge = [...cthDocuments];

          if (cthNumbers.some(cth => commonCthCodes.includes(cth))) {
            documentsToMerge = [...documentsToMerge, ...additionalDocs];
          }

          documentsToMerge = fetchedCthDocuments
            ? [...documentsToMerge, ...fetchedCthDocuments]
            : [...documentsToMerge];

          documentsToMerge = [...documentsToMerge, ...data.cth_documents];

          const uniqueDocuments = documentsToMerge.reduce((acc, current) => {
            const existingDocIndex = acc.findIndex(
              (doc) => doc.document_name === current.document_name
            );

            if (existingDocIndex === -1) {
              return acc.concat([current]);
            } else {
              if (current.url) {
                acc[existingDocIndex] = current;
              }
              return acc;
            }
          }, []);

          setCthDocuments(uniqueDocuments);
        } catch (error) {
          console.error("Error fetching CTH documents:", error);
        }
      } else if (data?.cth_documents && data.cth_documents.length > 0) {
        setCthDocuments(data.cth_documents);
      }
    }

    if (data) {
      setSelectedDocuments(data.documents);
    }

    getCthDocs();
  }, [data]);


  // Formik
  const formik = useFormik({
    initialValues: {
      checkedDocs: [],
      container_nos: [],
      obl_telex_bl: "",
      is_obl_recieved: false,
      document_received_date: "",
      vessel_berthing: "",
      hawb_hbl_no: "",
      hawb_hbl_date: "",
      awb_bl_date: "",
      gateway_igm_date: "",
      gateway_igm: "",
      igm_date: "",
      igm_no: "",
      line_no: "",
      no_of_pkgs: "",
      unit: "",
      hss: "",
      hss_address: "",
      hss_address_details: "",
      hss_branch_id: "",
      hss_city: "",
      hss_state: "",
      hss_ie_code_no: "",
      hss_postal_code: "",
      hss_country: "",
      hss_ad_code: "",
      bank_name: "",
      adCode: "",
      saller_name: "",
      firstCheck: "",
      priorityJob: "Normal",
      emptyContainerOffLoadDate: "",
      payment_method: "Transaction",
      gross_weight: "",
      job_net_weight: "",
      fta_Benefit_date_time: "",
      be_no: "",
      in_bond_be_no: "",
      be_date: "",
      be_filing_type: "",
      in_bond_be_date: "",
      discharge_date: "",
      status: "",
      detailed_status: "",
      free_time: "",
      arrival_date: "",
      do_validity: "",
      do_validity_upto_job_level: "",
      do_revalidation_upto_job_level: "",
      required_do_validity_upto: "",
      invoice_number: "",
      invoice_date: "",
      po_no: "",
      po_date: "",
      invoice_details: [],
      total_inv_value: "",
      cth_no: "",
      checklist: [],
      job_sticker_upload: [],
      // rail_out_date: "",
      remarks: "",
      description: "",
      description_details: [],
      consignment_type: "",
      sims_reg_no: "",
      pims_reg_no: "",
      nfmims_reg_no: "",
      sims_date: "",
      pims_date: "",
      nfmims_date: "",
      nfims_no: "",
      nfims_date: "",
      sims_no: "",
      sims_date: "",
      delivery_date: "",
      assessment_date: "",
      duty_paid_date: "",
      container_images: "",
      doPlanning: false,
      do_planning_date: "",
      examinationPlanning: false,
      examination_planning_date: "",
      examination_date: "",
      pcv_date: "",
      type_of_b_e: "",
      exBondValue: "",
      scheme: "",
      clearanceValue: "",
      do_copies: [],
      do_queries: [],
      documentationQueries: [],
      submissionQueries: [],
      eSachitQueries: [],
      processed_be_attachment: [],
      ooc_copies: [],
      in_bond_ooc_copies: [],
      gate_pass_copies: [],
      all_documents: [],
      do_revalidation: false,
      do_revalidation_date: "",
      out_of_charge: "",
      checked: false,
      type_of_Do: "",
      documentation_completed_date_time: "",

      submission_completed_date_time: "",
      completed_operation_date: "",
      esanchit_completed_date_time: "",
      bill_document_sent_to_accounts: "",
      do_completed: "",
      import_terms: "",
      // container_rail_out_date: ""   
      assessable_ammount: "",
      igst_ammount: "",
      sws_ammount: "",
      bcd_ammount: "",
      intrest_ammount: "", is_checklist_aprroved_date: "",
      is_checklist_aprroved: false,
      is_checklist_clicked: false,
      client_remark: "",
      DsrCharges: [],
      cifValue: "",
      freight: "",
      insurance: "",
      bill_no: "",
      bill_date: "",
      dsr_queries: [],
      lockBankDetails: false,
      other_charges_details: {
        is_single_for_all: true,
        miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
        revenue_deposit: { rate: 0, on: "Assessable" },
        landing_charge: { rate: 1 }
      },
      misc_charges: [],
      is_sent_to_submission: false,
      sent_to_submission_user_name: "",
      sent_to_submission_date_time: "",
    },
    onSubmit: async (values) => {
      // Filter documents that are sent to e-Sanchit
      const sentDocuments = cthDocuments.filter(
        (doc) => doc.is_sent_to_esanchit === true
      );

      if (sentDocuments.length > 0) {
        // Check if all *sent* documents are checked
        const allSentDocumentsChecked = sentDocuments.every(
          (doc) => doc.document_check_date && doc.document_check_date !== ""
        );

        if (allSentDocumentsChecked) {
          // Find the latest check date among sent documents
          const latestCheckDate = sentDocuments.reduce((max, doc) => {
            return doc.document_check_date > max
              ? doc.document_check_date
              : max;
          }, "");
          values.esanchit_completed_date_time = latestCheckDate;
        } else {
          values.esanchit_completed_date_time = "";
        }
      }

      const updatedCthDocuments = [...cthDocuments];

      // Get user info from localStorage for audit trail
      const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
      const headers = {
        'Content-Type': 'application/json',
        'user-id': user.username || 'unknown',
        'username': user.username || 'unknown',
        'user-role': user.role || 'unknown'
      };

      // Update the payload with the modified cthDocuments and other values
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-job/${params.branch_code}/${params.trade_type}/${params.mode}/${params.selected_year}/${params.job_no}`,
        {
          description_details: values.description_details,
          cth_documents: updatedCthDocuments,
          documents: selectedDocuments,
          checkedDocs: values.checkedDocs,
          vessel_berthing: values.vessel_berthing,
          hawb_hbl_no: values.hawb_hbl_no,
          hawb_hbl_date: values.hawb_hbl_date,
          awb_bl_no: values.awb_bl_no,
          awb_bl_date: values.awb_bl_date,
          cth_no: values.cth_no || values.description_details?.[0]?.cth_no,
          free_time: values.free_time,
          status: values.status,
          detailed_status: values.detailed_status,
          container_nos: values.container_nos,
          arrival_date: values.arrival_date,
          do_validity_upto_job_level: values.do_validity_upto_job_level,
          do_revalidation_upto_job_level: values.do_revalidation_upto_job_level,
          checklist: values.checklist,
          job_sticker_upload: values.job_sticker_upload,
          // rail_out_date: values.rail_out_date,
          remarks: values.remarks,
          description: values.description || values.description_details?.[0]?.description,
          consignment_type: values.consignment_type,
          sims_reg_no: values.sims_reg_no,
          pims_reg_no: values.pims_reg_no,
          nfmims_reg_no: values.nfmims_reg_no,
          sims_date: values.sims_date,
          pims_date: values.pims_date,
          nfmims_date: values.nfmims_date,
          nfims_no: values.nfims_no,
          nfims_date: values.nfims_date,
          sims_no: values.sims_no,
          sims_date: values.sims_date,
          delivery_date: values.delivery_date,
          gateway_igm_date: values.gateway_igm_date,
          gateway_igm: values.gateway_igm,
          igm_date: values.igm_date,
          igm_no: values.igm_no,
          line_no: values.line_no,
          no_of_pkgs: values.no_of_pkgs || values.description_details?.[0]?.quantity,
          unit: values.unit || values.description_details?.[0]?.unit,
          hss: values.hss,
          saller_name: values.saller_name,
          hss_address: {
            category: values.hss_address,
            details: values.hss_address_details,
            city: values.hss_city,
            state: values.hss_state,
            postal_code: values.hss_postal_code,
            country: values.hss_country,
            ad_code: values.hss_ad_code,
          },
          hss_branch_id: values.hss_branch_id,
          hss_ie_code_no: values.hss_ie_code_no,
          adCode: values.adCode,
          bank_name: values.bank_name,
          firstCheck: values.firstCheck,
          priorityJob: values.priorityJob,
          emptyContainerOffLoadDate: values.emptyContainerOffLoadDate,
          invoice_details: values.invoice_details,
          invoice_number:
            values.invoice_details?.[0]?.invoice_number ||
            values.description_details?.[0]?.sr_no_invoice ||
            values.invoice_number,
          invoice_date: values.invoice_details?.[0]?.invoice_date || values.invoice_date,
          po_no: values.invoice_details?.[0]?.po_no || values.po_no,
          po_date: values.invoice_details?.[0]?.po_date || values.po_date,
          total_inv_value: values.invoice_details?.[0]?.total_inv_value || values.total_inv_value,
          inv_currency: values.invoice_details?.[0]?.inv_currency || "",
          import_terms: values.invoice_details?.[0]?.toi || values.import_terms,
          freight: values.invoice_details?.[0]?.freight || values.freight,
          insurance: values.invoice_details?.[0]?.insurance || values.insurance,
          payment_method: values.payment_method,
          gross_weight: values.gross_weight,
          job_net_weight: values.job_net_weight,
          fta_Benefit_date_time: values.fta_Benefit_date_time,
          be_no: values.be_no,
          in_bond_be_no: values.in_bond_be_no,
          be_date: values.be_date,
          be_filing_type: values.be_filing_type,
          in_bond_be_date: values.in_bond_be_date,
          discharge_date: values.discharge_date,
          assessment_date: values.assessment_date,
          duty_paid_date: values.duty_paid_date,
          doPlanning: values.doPlanning,
          clearanceValue:
            values.description_details?.[0]?.clearance_under ||
            values.clearanceValue,
          pcv_date: values.pcv_date,
          do_planning_date: values.do_planning_date,
          examinationPlanning: values.examinationPlanning,
          examination_planning_date: values.examination_planning_date,
          do_copies: values.do_copies,
          do_queries: values.do_queries,
          documentationQueries: values.documentationQueries,
          submissionQueries: values.submissionQueries,
          eSachitQueries: values.eSachitQueries,
          processed_be_attachment: values.processed_be_attachment,
          ooc_copies: values.ooc_copies,
          in_bond_ooc_copies: values.in_bond_ooc_copies,
          gate_pass_copies: values.gate_pass_copies,
          all_documents: values.all_documents,
          do_revalidation: values.do_revalidation,
          do_revalidation_date: values.do_revalidation_date, is_checklist_aprroved_date: values.is_checklist_aprroved_date,
          is_checklist_aprroved: values.is_checklist_aprroved,
          is_checklist_clicked: Boolean(values.is_checklist_clicked),
          lockBankDetails: Boolean(values.lockBankDetails),
          required_do_validity_upto: values.required_do_validity_upto,
          out_of_charge: values.out_of_charge,
          checked: values.checked,
          obl_telex_bl: values.obl_telex_bl,
          is_obl_recieved: values.is_obl_recieved,
          document_received_date: values.document_received_date,
          type_of_Do: values.type_of_Do,
          type_of_b_e: values.type_of_b_e,
          exBondValue: values.exBondValue,
          scheme: values.scheme,
          documentation_completed_date_time:
            values.documentation_completed_date_time,
          submission_completed_date_time: values.submission_completed_date_time,
          completed_operation_date: values.completed_operation_date,
          esanchit_completed_date_time: values.esanchit_completed_date_time,
          bill_document_sent_to_accounts: values.bill_document_sent_to_accounts,
          do_completed: values.do_completed,
          import_terms: values.import_terms,
          freight: values.freight,
          cifValue: values.cifValue,
          insurance: values.insurance,
          bill_date: values.bill_date,
          bill_no: values.bill_no,
          assessable_ammount: values.assessable_ammount,
          igst_ammount: values.igst_ammount,
          sws_ammount: values.sws_ammount,
          bcd_ammount: values.bcd_ammount,
          intrest_ammount: values.intrest_ammount,
          fine_amount: values.fine_amount,
          penalty_amount: values.penalty_amount,
          total_duty: values.total_duty,
          client_remark: values.client_remark,
          dsr_queries: values.dsr_queries,
          other_charges_details: values.other_charges_details,
          misc_charges: values.misc_charges,
          is_sent_to_submission: values.is_sent_to_submission,
          sent_to_submission_user_name: values.sent_to_submission_user_name,
          sent_to_submission_date_time: values.sent_to_submission_date_time,
        },
        { headers }
      );
      localStorage.setItem("tab_value", 1);
      setTabValue(1);
      // Close the tab after successful submit
      setTimeout(() => {
        window.close();
      }, 500);


    },
  });

  // Utility function to handle undefined/null checks
  const safeValue = (value, defaultVal = "") =>
    value === undefined || value === null ? defaultVal : value;
  const filteredClearanceOptions =
    clearanceOptionsMapping[formik.values.type_of_b_e] || [];
  // When the BE type changes, update Formik's clearanceValue field to the first available option only if no value is set.
  useEffect(() => {
    if (filteredClearanceOptions.length > 0 && !formik.values.clearanceValue) {
      formik.setFieldValue("clearanceValue", filteredClearanceOptions[0].value);
    } else if (filteredClearanceOptions.length === 0) {
      formik.setFieldValue("clearanceValue", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.type_of_b_e]);

  // Validation function remains unchanged – now you can use it in your onChange for clearance selection.
  const canChangeClearance = () => {
    // Insert your custom validation logic here.
    return true;
  };

  // Instead of having a separate reset function for Ex-Bond fields that use useState,
  // update Formik values directly.
  const resetOtherDetails = () => {
    formik.setFieldValue("exBondValue", "");
    formik.setFieldValue("in_bond_be_no", "");
    formik.setFieldValue("in_bond_be_date", "");
    formik.setFieldValue("in_bond_ooc_copies", []);
  };

  const serializedContainerNos = useMemo(
    () =>
      JSON.stringify(
        formik.values.container_nos.map((container) => ({
          arrival_date: container.arrival_date,
          // container_rail_out_date: container.container_rail_out_date,
          required_do_validity_upto: container.required_do_validity_upto || "",
        }))
      ),
    [formik.values.container_nos]
  );

  const serializedDescriptionDetails = useMemo(
    () => JSON.stringify(formik.values.description_details || []),
    [formik.values.description_details]
  );

  const serializedInvoiceDetails = useMemo(
    () => JSON.stringify(formik.values.invoice_details || []),
    [formik.values.invoice_details]
  );
  // Update formik intial values when data is fetched from db
  useEffect(() => {
    if (data) {
      setSelectedRegNo(
        data.sims_reg_no
          ? "sims"
          : data.pims_reg_no
            ? "pims"
            : data.nfmims_reg_no
              ? "nfmims"
              : ""
      );

      const container_nos = safeValue(data.container_nos, []).map((container) => ({
        do_revalidation: safeValue(container.do_revalidation, []),
        required_do_validity_upto: safeValue(container.required_do_validity_upto),
        arrival_date: checked
          ? safeValue(data.arrival_date)
          : safeValue(container.arrival_date)
            ? convertDateFormatForUI(container.arrival_date)
            : "",
        container_number: safeValue(container.container_number),
        size: safeValue(container.size, "20"),
        seal_number: Array.isArray(container.seal_number) ? container.seal_number : (container.seal_number ? [container.seal_number] : []),
        wire_seal: Array.isArray(container.wire_seal) ? container.wire_seal : (container.wire_seal ? [container.wire_seal] : []),
        net_weight_as_per_PL_document: safeValue(container.net_weight_as_per_PL_document),
        container_rail_out_date: safeValue(container.container_rail_out_date),
        by_road_movement_date: safeValue(container.by_road_movement_date),
        delivery_date: safeValue(container.delivery_date),
        emptyContainerOffLoadDate: safeValue(container.emptyContainerOffLoadDate),
        weighment_slip_images: safeValue(container.weighment_slip_images, []),
        container_images: safeValue(container.container_images, []),
        loose_material_photo: safeValue(container.loose_material_photo, []),
        loose_material: safeValue(container.loose_material, []),
        examination_videos: safeValue(container.examination_videos, []),
        container_pre_damage_images: safeValue(container.container_pre_damage_images, []),
        physical_weight: safeValue(container.physical_weight),
        do_revalidation_date: safeValue(container.do_revalidation_date),
        do_validity_upto_container_level: safeValue(container.do_validity_upto_container_level),
        do_revalidation_upto_container_level: safeValue(container.do_revalidation_upto_container_level),
        tare_weight: safeValue(container.tare_weight),
        actual_weight:
          container.physical_weight && container.tare_weight
            ? (parseFloat(container.physical_weight) - parseFloat(container.tare_weight)).toFixed(2)
            : safeValue(container.actual_weight),
        net_weight: safeValue(container.net_weight),
        container_gross_weight: safeValue(container.container_gross_weight),
        weight_shortage:
          container.physical_weight && container.tare_weight
            ? (
              parseFloat(container.physical_weight) -
              parseFloat(container.tare_weight) -
              (parseFloat(container.container_gross_weight) || 0)
            ).toFixed(2)
            : safeValue(container.weight_shortage),
        weight_excess:
          container.physical_weight && container.tare_weight
            ? (
              parseFloat(container.physical_weight) -
              parseFloat(container.tare_weight) -
              (parseFloat(container.container_gross_weight) || 0)
            ).toFixed(2)
            : safeValue(container.weight_excess),
        transporter: safeValue(container.transporter),
      }));


      formik.setValues({
        container_nos,
        checkedDocs: safeValue(data.checkedDocs, []),
        is_obl_recieved: safeValue(data.is_obl_recieved, false),
        document_received_date: safeValue(data.document_received_date),
        arrival_date: safeValue(data.arrival_date),
        vessel_berthing: safeValue(data.vessel_berthing)
          ? new Date(data.vessel_berthing).toLocaleDateString("en-CA").split("/").reverse().join("-")
          : "",
        free_time: safeValue(data.free_time, 0),
        status: safeValue(data.status),
        detailed_status: safeValue(data.detailed_status, "ETA Date Pending"),
        do_validity: safeValue(data.do_validity),
        cth_no: safeValue(data.cth_no),
        doPlanning: safeValue(data.doPlanning, false),
        do_planning_date: safeValue(data.do_planning_date),
        is_checklist_aprroved: safeValue(data.is_checklist_aprroved),
        is_checklist_clicked: Boolean(safeValue(data.is_checklist_clicked, false)),
        lockBankDetails: Boolean(safeValue(data.lockBankDetails, false)),
        is_checklist_aprroved_date: safeValue(data.is_checklist_aprroved_date),
        client_remark: safeValue(data.client_remark),
        client_remark: safeValue(data.client_remark),
        examinationPlanning: safeValue(data.examinationPlanning, false),
        examination_planning_date: safeValue(data.examination_planning_date),
        do_validity_upto_job_level: safeValue(data.do_validity_upto_job_level),
        do_revalidation_upto_job_level: safeValue(data.do_revalidation_upto_job_level),
        checklist: safeValue(data.checklist, []),
        job_sticker_upload: safeValue(data.job_sticker_upload, []),
        remarks: safeValue(data.remarks),
        description: safeValue(data.description),
        description_details:
          Array.isArray(data.description_details) &&
            data.description_details.length > 0
            ? data.description_details
            : [
              {
                description: safeValue(data.description),
                cth_no: safeValue(data.cth_no),
                clearance_under: safeValue(data.clearanceValue),
                sr_no_invoice: safeValue(data.invoice_number),
                sr_no_lic: "",
                quantity: safeValue(data.no_of_pkgs),
                unit: safeValue(data.unit),
              },
            ],
        consignment_type: safeValue(data.consignment_type),
        sims_reg_no: safeValue(data.sims_reg_no),
        pims_reg_no: safeValue(data.pims_reg_no),
        nfmims_reg_no: safeValue(data.nfmims_reg_no),
        sims_date: safeValue(data.sims_date),
        pims_date: safeValue(data.pims_date),
        nfmims_date: safeValue(data.nfmims_date),
        nfims_no: safeValue(data.nfims_no),
        nfims_date: safeValue(data.nfims_date),
        sims_no: safeValue(data.sims_no),
        sims_date: safeValue(data.sims_date),
        delivery_date: safeValue(data.delivery_date),
        gateway_igm_date: safeValue(data.gateway_igm_date),
        gateway_igm: safeValue(data.gateway_igm),
        igm_date: safeValue(data.igm_date),
        igm_no: safeValue(data.igm_no),
        line_no: safeValue(data.line_no),
        no_of_pkgs: safeValue(data.no_of_pkgs),
        unit: safeValue(data.unit),
        hss: safeValue(data.hss),
        is_sent_to_submission: safeValue(data.is_sent_to_submission, false),
        sent_to_submission_user_name: safeValue(data.sent_to_submission_user_name, ""),
        sent_to_submission_date_time: safeValue(data.sent_to_submission_date_time, ""),
        saller_name: safeValue(data.saller_name),
        hss_address: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.category) : safeValue(data.hss_address),
        hss_address_details: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.details) : safeValue(data.hss_address_details),
        hss_branch_id: safeValue(data.hss_branch_id),
        hss_city: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.city) : safeValue(data.hss_city),
        hss_state: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.state) : safeValue(data.hss_state),
        hss_ie_code_no: safeValue(data.hss_ie_code_no),
        hss_postal_code: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.postal_code) : safeValue(data.hss_postal_code),
        hss_country: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.country) : safeValue(data.hss_country),
        hss_ad_code: data.hss_address && typeof data.hss_address === 'object' ? safeValue(data.hss_address.ad_code) : safeValue(data.hss_ad_code),
        adCode: safeValue(data.adCode),
        bank_name: safeValue(data.bank_name),
        firstCheck: safeValue(data.firstCheck),
        priorityJob: safeValue(data.priorityJob, "Normal"),
        emptyContainerOffLoadDate: safeValue(data.emptyContainerOffLoadDate),
        job_net_weight: safeValue(data.job_net_weight),
        payment_method: safeValue(data.payment_method, "Transaction"),
        gross_weight: safeValue(data.gross_weight),
        fta_Benefit_date_time: safeValue(data.fta_Benefit_date_time),
        be_no: safeValue(data.be_no),
        in_bond_be_no: safeValue(data.in_bond_be_no),
        be_date: safeValue(data.be_date),
        be_filing_type: safeValue(data.be_filing_type),
        in_bond_be_date: safeValue(data.in_bond_be_date),
        discharge_date: safeValue(data.discharge_date),
        hawb_hbl_date: safeValue(data.hawb_hbl_date),
        hawb_hbl_no: safeValue(data.hawb_hbl_no),
        awb_bl_date: safeValue(data.awb_bl_date),
        awb_bl_no: safeValue(data.awb_bl_no),
        assessment_date: safeValue(data.assessment_date),
        examination_date: safeValue(data.examination_date),
        pcv_date: safeValue(data.pcv_date),
        type_of_b_e: safeValue(data.type_of_b_e),
        exBondValue: safeValue(data.exBondValue),
        scheme: safeValue(data.scheme),
        clearanceValue: safeValue(data.clearanceValue),
        duty_paid_date: safeValue(data.duty_paid_date),
        assessable_ammount: safeValue(data.assessable_ammount),
        penalty_amount: safeValue(data.penalty_amount),
        fine_amount: safeValue(data.fine_amount),
        igst_ammount: safeValue(data.igst_ammount),
        sws_ammount: safeValue(data.sws_ammount),
        intrest_ammount: safeValue(data.intrest_ammount),
        bcd_ammount: safeValue(data.bcd_ammount),
        total_duty: safeValue(data.total_duty),
        do_copies: safeValue(data.do_copies, []),
        do_queries: safeValue(data.do_queries, []),
        documentationQueries: safeValue(data.documentationQueries, []),
        submissionQueries: safeValue(data.submissionQueries, []),
        eSachitQueries: safeValue(data.eSachitQueries, []),
        processed_be_attachment: safeValue(data.processed_be_attachment, []),
        ooc_copies: safeValue(data.ooc_copies, []),
        in_bond_ooc_copies: safeValue(data.in_bond_ooc_copies, []),
        gate_pass_copies: safeValue(data.gate_pass_copies, []),
        all_documents: safeValue(data.all_documents, []),
        do_revalidation: safeValue(data.do_revalidation, false),
        do_revalidation_date: safeValue(data.do_revalidation_date),
        documentation_completed_date_time: safeValue(data.documentation_completed_date_time),
        submission_completed_date_time: safeValue(data.submission_completed_date_time),
        completed_operation_date: safeValue(data.completed_operation_date),
        esanchit_completed_date_time: safeValue(data.esanchit_completed_date_time),
        bill_document_sent_to_accounts: safeValue(data.bill_document_sent_to_accounts),
        do_completed: safeValue(data.do_completed),
        import_terms: safeValue(data.import_terms),
        freight: safeValue(data.freight),
        insurance: safeValue(data.insurance),
        invoice_number: safeValue(data.invoice_number),
        invoice_date: safeValue(data.invoice_date),
        po_no: safeValue(data.po_no),
        po_date: safeValue(data.po_date),
        total_inv_value: safeValue(data.total_inv_value),
        invoice_details:
          Array.isArray(data.invoice_details) && data.invoice_details.length > 0
            ? safeValue(data.invoice_details, []).map(inv => ({
                ...inv,
                po_no: inv.po_no || "",
                po_date: inv.po_date || ""
              }))
            : [
                {
                  invoice_number: safeValue(data.invoice_number),
                  invoice_date: safeValue(data.invoice_date),
                  po_no: safeValue(data.po_no),
                  po_date: safeValue(data.po_date),
                  total_inv_value: safeValue(data.total_inv_value),
                  inv_currency: safeValue(data.inv_currency),
                  toi: safeValue(data.import_terms) || "CIF",
                  freight: safeValue(data.freight),
                  insurance: safeValue(data.insurance),
                },
              ],
        bill_date: safeValue(data.bill_date),
        bill_no: safeValue(data.bill_no),
        cifValue: safeValue(data.cifValue),
        out_of_charge: safeValue(data.out_of_charge),
        checked: safeValue(data.checked, false),
        type_of_Do: safeValue(data.type_of_Do),
        obl_telex_bl: safeValue(data.obl_telex_bl),

        dsr_queries: safeValue(data.dsr_queries, []),
        other_charges_details: safeValue(data.other_charges_details, {
          is_single_for_all: true,
          miscellaneous: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          agency: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          discount: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          loading: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          freight: { currency: "", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          insurance: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          addl_charge: { currency: "INR", exchange_rate: 1, rate: 0, amount: 0, remark: "" },
          revenue_deposit: { rate: 0, on: "Assessable" },
          landing_charge: { rate: 1 }
        }),
        misc_charges: safeValue(data.misc_charges, []),
      });
    }
    // eslint-disable-next-line
  }, [data]);

  // Add a new useEffect to handle checkbox changes
  useEffect(() => {
    if (formik.values.container_nos?.length > 0) {
      const updatedContainers = formik.values.container_nos.map(
        (container) => ({
          ...container,
          arrival_date: formik.values.checked
            ? formik.values.arrival_date || ""
            : container.arrival_date,
        })
      );

      formik.setFieldValue("container_nos", updatedContainers);
    }
  }, [formik.values.checked, formik.values.arrival_date]);

  // Update detention from dates and set do_validity_upto_job_level
  useEffect(() => {
    function addDaysToDate(dateString, days) {
      if (!dateString) return "";

      const date = new Date(dateString);
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (formik.values.container_nos?.length > 0) {
      let updatedDate = [];

      // If all containers arrive at the same time, use the common arrival date
      if (formik.values.checked) {
        const commonDate = formik.values.arrival_date;
        updatedDate = formik.values.container_nos.map(() =>
          addDaysToDate(commonDate, parseInt(formik.values.free_time) || 0)
        );
      } else {
        // Use individual container arrival dates
        updatedDate = formik.values.container_nos.map((container) =>
          addDaysToDate(
            container.arrival_date,
            parseInt(formik.values.free_time) || 0
          )
        );
      }

      setDetentionFrom(updatedDate);

      // Find the earliest date from updatedDate
      // Find the earliest date from updatedDate
      const earliestDate = updatedDate.reduce((earliest, current) => {
        return current < earliest ? current : earliest;
      }, "9999-12-31");

      // Helper to subtract one day safely
      function subtractOneDay(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      if (earliestDate !== "9999-12-31") {
        const earliest = new Date(earliestDate);
        const oneDayBefore = new Date(earliest);
        oneDayBefore.setDate(oneDayBefore.getDate() - 1);

        // If difference between earliestDate and oneDayBefore is > 0, use oneDayBefore
        const diffDays = (earliest - oneDayBefore) / (1000 * 60 * 60 * 24);

        const validityDate =
          diffDays > 0
            ? subtractOneDay(earliestDate)
            : earliestDate;

        formik.setFieldValue("do_validity_upto_job_level", validityDate);
      } else {
        formik.setFieldValue(
          "do_validity_upto_job_level",
          data.do_validity_upto_job_level
        );
      }

    }
    // eslint-disable-next-line
  }, [
    formik.values.arrival_date,
    formik.values.free_time,
    formik.values.checked,
    formik.values.container_nos,
    serializedContainerNos,
  ]);

  // UseEffect to update do_validity_upto_container_level when do_validity_upto_job_level changes
  useEffect(() => {
    if (formik.values.do_validity_upto_job_level) {
      const updatedContainers = formik.values.container_nos.map(
        (container) => ({
          ...container,
          do_validity_upto_container_level:
            formik.values.do_validity_upto_job_level,
        })
      );

      formik.setFieldValue("container_nos", updatedContainers);
    }
    // eslint-disable-next-line
  }, [formik.values.do_validity_upto_job_level]);

  // Handle automatic syncing of top-level fields from Description Details
  useEffect(() => {
    if (formik.values.description_details?.length > 0) {
      const firstRow = formik.values.description_details[0];
      if (firstRow.description && !formik.values.description) formik.setFieldValue("description", firstRow.description || "");
      if (firstRow.cth_no && !formik.values.cth_no) formik.setFieldValue("cth_no", firstRow.cth_no || "");
      if (firstRow.clearance_under && !formik.values.clearanceValue) formik.setFieldValue("clearanceValue", firstRow.clearance_under || "");
      if (firstRow.sr_no_invoice && !formik.values.invoice_number) formik.setFieldValue("invoice_number", firstRow.sr_no_invoice || "");
      if (firstRow.quantity && !formik.values.no_of_pkgs) formik.setFieldValue("no_of_pkgs", firstRow.quantity || "");
      if (firstRow.unit && !formik.values.unit) formik.setFieldValue("unit", firstRow.unit || "");
      if (firstRow.unit_price && !formik.values.unit_price) formik.setFieldValue("unit_price", firstRow.unit_price || "");
      if (firstRow.amount && !formik.values.cif_amount) formik.setFieldValue("cif_amount", firstRow.amount || "");
    }
  }, [serializedDescriptionDetails]);

  // Handle automatic syncing of top-level fields from Invoice Details
  useEffect(() => {
    if (formik.values.invoice_details?.length > 0) {
      const firstRow = formik.values.invoice_details[0];
      if (firstRow.invoice_number && !formik.values.invoice_number) formik.setFieldValue("invoice_number", firstRow.invoice_number || "");
      if (firstRow.invoice_date && !formik.values.invoice_date) formik.setFieldValue("invoice_date", firstRow.invoice_date || "");
      if (firstRow.po_no && !formik.values.po_no) formik.setFieldValue("po_no", firstRow.po_no || "");
      if (firstRow.total_inv_value && !formik.values.total_inv_value) formik.setFieldValue("total_inv_value", firstRow.total_inv_value || "");
      if (firstRow.toi && !formik.values.import_terms) formik.setFieldValue("import_terms", firstRow.toi || "");
      if (firstRow.freight && !formik.values.freight) formik.setFieldValue("freight", firstRow.freight || "");
      if (firstRow.insurance && !formik.values.insurance) formik.setFieldValue("insurance", firstRow.insurance || "");
    }
  }, [serializedInvoiceDetails]);

  const handleFileChange = async (event, documentName, index, isCth) => {
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
      setFileSnackbar,
      isCth
    );

    if (isCth) {
      const updatedCthDocuments = [...cthDocuments];
      updatedCthDocuments[index].url = photoUrl; // Store as a string
      setCthDocuments(updatedCthDocuments);
    } else {
      const updatedSelectedDocuments = [...selectedDocuments];
      updatedSelectedDocuments[index].url = photoUrl; // Store as a string
      setSelectedDocuments(updatedSelectedDocuments);
    }
  };

  const handleDocumentChange = (index, newValue) => {
    setSelectedDocuments((prevSelectedDocuments) => {
      const updatedDocuments = [...prevSelectedDocuments];

      // Ensure the new object has the desired structure
      updatedDocuments[index] = {
        document_name: newValue?.document_name || "",
        document_code: newValue?.document_code || "",
        url: newValue?.url || [], // or `newValue.url` if you get `url` in the `newValue`
        document_check_date: newValue?.document_check_date || "",
      };

      return updatedDocuments;
    });
  };

  const handleAddDocument = () => {
    setSelectedDocuments([
      ...selectedDocuments,
      {
        document_name: "",
        document_code: "",
        url: [],
        document_check_date: "",
      },
    ]);
  };

  const handleRemoveDocument = (index) => {
    const newSelectedDocuments = [...selectedDocuments];
    newSelectedDocuments.splice(index, 1);
    setSelectedDocuments(newSelectedDocuments);
  };

  const filterDocuments = (selectedDocuments, currentIndex) => {
    // Ensure documents is an array
    const validDocuments = Array.isArray(documents) ? documents : [];

    const restrictedDocs = new Set();

    selectedDocuments.forEach((doc, index) => {
      if (doc.document) {
        restrictedDocs.add(doc.document.document_code);
        if (doc.document.document_code === "380000") {
          restrictedDocs.add("331000");
        } else if (doc.document.document_code === "271000") {
          restrictedDocs.add("331000");
        } else if (doc.document.document_code === "331000") {
          restrictedDocs.add("380000");
          restrictedDocs.add("271000");
        }
      }
    });

    return validDocuments.filter(
      (doc) => !restrictedDocs.has(doc.document_code)
    );
  };

  return {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    setCthDocuments,
    documents,
    setNewDocumentName,
    newDocumentName,
    newDocumentCode,
    clearanceOptionsMapping,
    schemeOptions,
    setNewDocumentCode,
    handleFileChange,
    selectedDocuments,
    setSelectedDocuments,
    handleDocumentChange,
    handleAddDocument,
    handleRemoveDocument,
    filterDocuments,
    canEditOrDelete,
    cth_Dropdown,
    setSelectedDocument,
    selectedDocument,
    jobDetails,
    setJobDetails,

    beTypeOptions,
    filteredClearanceOptions,
    canChangeClearance,
    resetOtherDetails,

    setData
  };
}

export default useFetchJobDetails;
