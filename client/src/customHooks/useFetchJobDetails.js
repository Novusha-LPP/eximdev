import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useFormik } from "formik";
import { convertDateFormatForUI } from "../utils/convertDateFormatForUI";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";
// import { Dropdown } from "react-bootstrap";

const handleFileUpload = async (file, folderName, setFileSnackbar) => {
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
  setFileSnackbar
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
      document_name: "Bill of Lading",
      document_code: "704000",
    },
    // {
    //   document_name: "Certificate of Origin",
    //   document_code: "861000",
    // },
    // {
    //   document_name: "Contract",
    //   document_code: "315000",
    // },
    // {
    //   document_name: "Insurance",
    //   document_code: "91WH13",
    // },
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
    // {
    //   document_name: "Commercial Invoice",
    //   document_code: "380000",
    // },
    // {
    //   document_name: "Packing List",
    //   document_code: "271000",
    // },
    // {
    //   document_name: "Bill of Lading",
    //   document_code: "704000",
    // },
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
    ],
    "In-Bond": [{ value: "In-Bond", label: "In-Bond" }],
    "Ex-Bond": [
      { value: "Full Duty", label: "Full Duty" },
      { value: "DEEC", label: "DEEC" },
      { value: "EPCG", label: "EPCG" },
      { value: "RODTEP", label: "RODTEP" },
      { value: "ROSTL", label: "ROSTL" },
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
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${params.selected_year}/${params.job_no}`
      );
      setData(response.data);
      setSelectedDocuments(response.data.documents);
    }

    getJobDetails();
  }, [params.importer, params.job_no, params.selected_year]);

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

  // Fetch CTH documents based on CTH number and Update additional CTH documents based on CTH number
  useEffect(() => {
    async function getCthDocs() {
      if (data?.cth_no) {
        const cthRes = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-cth-docs/${data?.cth_no}`
        );

        // Fetched CTH documents with URLs merged from data.cth_documents if they exist
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

        // Start with initial cthDocuments
        let documentsToMerge = [...cthDocuments];

        // If data.cth_no is in commonCthCodes, merge with additionalDocs
        if (commonCthCodes.includes(data.cth_no)) {
          documentsToMerge = [...documentsToMerge, ...additionalDocs];
        }

        // Merge fetched CTH documents
        documentsToMerge = fetchedCthDocuments
          ? [...documentsToMerge, ...fetchedCthDocuments]
          : [...documentsToMerge];

        // Merge data.cth_documents into the array
        documentsToMerge = [...documentsToMerge, ...data.cth_documents];

        // Eliminate duplicates, keeping only the document with a URL if it exists
        const uniqueDocuments = documentsToMerge.reduce((acc, current) => {
          const existingDocIndex = acc.findIndex(
            (doc) => doc.document_name === current.document_name
          );

          if (existingDocIndex === -1) {
            // Document does not exist, add it
            return acc.concat([current]);
          } else {
            // Document exists, replace it only if the current one has a URL
            if (current.url) {
              acc[existingDocIndex] = current;
            }
            return acc;
          }
        }, []);

        setCthDocuments(uniqueDocuments);
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
      document_received_date: "",
      vessel_berthing: "",
      gateway_igm_date: "",
      hss: "",
      bank_name: "",
      adCode: "",
      saller_name: "",
      fristCheck: "",
      priorityJob: "Normal",
      emptyContainerOffLoadDate: "",
      payment_method: "Transaction",
      gross_weight: "",
      job_net_weight: "",
      fta_Benefit_date_time: "",
      be_no: "",
      in_bond_be_no: "",
      be_date: "",
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
      cth_no: "",
      checklist: [],
      job_sticker_upload: [],
      rail_out_date: "",
      remarks: "",
      description: "",
      consignment_type: "",
      sims_reg_no: "",
      pims_reg_no: "",
      nfmims_reg_no: "",
      sims_date: "",
      pims_date: "",
      nfmims_date: "",
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
      // container_rail_out_date: ""
    },
    onSubmit: async (values) => {
      // Create a copy of cthDocuments to modify
      const updatedCthDocuments = cthDocuments.map((doc) => {
        if (doc.document_check_date === "") {
          // Clear the esanchit_completed_date_time if a document_check_date is empty
          values.esanchit_completed_date_time = "";
        }
        return doc;
      });

      // Update the payload with the modified cthDocuments and other values
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-job/${params.selected_year}/${params.job_no}`,
        {
          cth_documents: updatedCthDocuments,
          documents: selectedDocuments,
          checkedDocs: values.checkedDocs,
          vessel_berthing: values.vessel_berthing,
          cth_no: values.cth_no,
          free_time: values.free_time,
          status: values.status,
          detailed_status: values.detailed_status,
          container_nos: values.container_nos,
          arrival_date: values.arrival_date,
          do_validity_upto_job_level: values.do_validity_upto_job_level,
          do_revalidation_upto_job_level: values.do_revalidation_upto_job_level,
          checklist: values.checklist,
          job_sticker_upload: values.job_sticker_upload,
          rail_out_date: values.rail_out_date,
          remarks: values.remarks,
          description: values.description,
          consignment_type: values.consignment_type,
          sims_reg_no: values.sims_reg_no,
          pims_reg_no: values.pims_reg_no,
          nfmims_reg_no: values.nfmims_reg_no,
          sims_date: values.sims_date,
          pims_date: values.pims_date,
          nfmims_date: values.nfmims_date,
          delivery_date: values.delivery_date,
          gateway_igm_date: values.gateway_igm_date,
          hss: values.hss,
          saller_name: values.saller_name,
          adCode: values.adCode,
          bank_name: values.bank_name,
          fristCheck: values.fristCheck,
          priorityJob: values.priorityJob,
          emptyContainerOffLoadDate: values.emptyContainerOffLoadDate,
          payment_method: values.payment_method,
          gross_weight: values.gross_weight,
          job_net_weight: values.job_net_weight,
          fta_Benefit_date_time: values.fta_Benefit_date_time,
          be_no: values.be_no,
          in_bond_be_no: values.in_bond_be_no,
          be_date: values.be_date,
          in_bond_be_date: values.in_bond_be_date,
          discharge_date: values.discharge_date,
          assessment_date: values.assessment_date,
          duty_paid_date: values.duty_paid_date,
          doPlanning: values.doPlanning,
          clearanceValue: values.clearanceValue,
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
          do_revalidation_date: values.do_revalidation_date,
          required_do_validity_upto: values.required_do_validity_upto,
          out_of_charge: values.out_of_charge,
          checked: values.checked,
          obl_telex_bl: values.obl_telex_bl,
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
        }
      );

      localStorage.setItem("tab_value", 1);
      setTabValue(1);
      navigate("/import-dsr");
    },
  });
  const filteredClearanceOptions =
    clearanceOptionsMapping[formik.values.type_of_b_e] || [];

  // When the BE type changes, update Formik's clearanceValue field to the first available option.
  useEffect(() => {
    if (filteredClearanceOptions.length > 0) {
      formik.setFieldValue("clearanceValue", filteredClearanceOptions[0].value);
    } else {
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
          free_time: container.free_time,
          required_do_validity_upto: container.required_do_validity_upto || "",
        }))
      ),
    [formik.values.container_nos]
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

      const container_nos = data.container_nos?.map((container) => ({
        do_revalidation:
          container.do_revalidation === undefined
            ? []
            : container.do_revalidation,
        required_do_validity_upto:
          container.required_do_validity_upto === undefined
            ? ""
            : container.required_do_validity_upto,
        arrival_date: checked
          ? data.arrival_date || "" // If checked, use the common arrival date
          : container.arrival_date === undefined
          ? ""
          : convertDateFormatForUI(container.arrival_date),
        container_number: container.container_number,
        size: container.size === undefined ? "20" : container.size,
        seal_number:
          container.seal_number === undefined ? "" : container.seal_number,
        container_rail_out_date:
          container.container_rail_out_date === undefined
            ? ""
            : container.container_rail_out_date,
        delivery_date:
          container.delivery_date === undefined ? "" : container.delivery_date,
        emptyContainerOffLoadDate:
          container.emptyContainerOffLoadDate === undefined
            ? ""
            : container.emptyContainerOffLoadDate,
        weighment_slip_images:
          container.weighment_slip_images === undefined
            ? []
            : container.weighment_slip_images,
        container_images:
          container.container_images === undefined
            ? []
            : container.container_images,
        loose_material_photo:
          container.loose_material_photo === undefined
            ? []
            : container.loose_material_photo,
        loose_material:
          container.loose_material === undefined
            ? []
            : container.loose_material,
        examination_videos:
          container.examination_videos === undefined
            ? []
            : container.examination_videos,
        container_pre_damage_images:
          container.container_pre_damage_images === undefined
            ? []
            : container.container_pre_damage_images,
        physical_weight:
          container.physical_weight === undefined
            ? ""
            : container.physical_weight,
        do_revalidation_date:
          container.do_revalidation_date === undefined
            ? ""
            : container.do_revalidation_date,
        do_validity_upto_container_level:
          container.do_validity_upto_container_level === undefined
            ? ""
            : container.do_validity_upto_container_level,
        do_revalidation_upto_container_level:
          container.do_revalidation_upto_container_level === undefined
            ? ""
            : container.do_revalidation_upto_container_level,
        tare_weight:
          container.tare_weight === undefined ? "" : container.tare_weight,
        actual_weight:
          container.actual_weight === undefined ? "" : container.actual_weight,
        net_weight:
          container.net_weight === undefined ? "" : container.net_weight,
        container_gross_weight:
          container.container_gross_weight === undefined
            ? ""
            : container.container_gross_weight,
        weight_shortage:
          container.physical_weight &&
          container.container_gross_weight &&
          container.actual_weight &&
          container.tare_weight &&
          container.physical_weight !== "0" &&
          container.container_gross_weight !== "0" &&
          container.actual_weight !== "0" &&
          container.tare_weight !== "0"
            ? container.weight_shortage
            : "",

        weight_excess:
          container.physical_weight &&
          container.container_gross_weight &&
          container.actual_weight &&
          container.tare_weight &&
          container.physical_weight !== "0" &&
          container.container_gross_weight !== "0" &&
          container.actual_weight !== "0" &&
          container.tare_weight !== "0"
            ? container.weight_excess
            : "",
        transporter:
          container.transporter === undefined ? "" : container.transporter,
      }));

      formik.setValues({
        ...{ container_nos },
        checkedDocs: data.checkedDocs === undefined ? [] : data.checkedDocs,
        obl_telex_bl: data.obl_telex_bl ? data.obl_telex_bl : "",
        document_received_date: data.document_received_date
          ? data.document_received_date
          : "",
        arrival_date: data.arrival_date || "",
        vessel_berthing:
          data.vessel_berthing === undefined
            ? ""
            : new Date(data.vessel_berthing)
                .toLocaleDateString("en-CA")
                .split("/")
                .reverse()
                .join("-"),
        free_time: data.free_time === undefined ? 0 : data.free_time,
        status: data.status,
        detailed_status:
          data.detailed_status === undefined
            ? "ETA Date Pending"
            : data.detailed_status,
        do_validity: data.do_validity === undefined ? "" : data.do_validity,
        cth_no: data.cth_no === undefined ? "" : data.cth_no,
        doPlanning: data.doPlanning === undefined ? false : data.doPlanning,
        do_planning_date:
          data.do_planning_date === undefined ? "" : data.do_planning_date,
        examinationPlanning:
          data.examinationPlanning === undefined
            ? false
            : data.examinationPlanning,
        examination_planning_date:
          data.examination_planning_date === undefined
            ? ""
            : data.examination_planning_date,
        do_validity_upto_job_level:
          data.do_validity_upto_job_level === undefined
            ? ""
            : data.do_validity_upto_job_level,
        do_revalidation_upto_job_level:
          data.do_revalidation_upto_job_level === undefined
            ? ""
            : data.do_revalidation_upto_job_level,
        checklist: data.checklist === undefined ? [] : data.checklist,
        job_sticker_upload:
          data.job_sticker_upload === undefined ? [] : data.job_sticker_upload,
        remarks: data.remarks === undefined ? "" : data.remarks,
        rail_out_date:
          data.rail_out_date === undefined ? "" : data.rail_out_date,
        description: data.description === undefined ? "" : data.description,
        consignment_type:
          data.consignment_type === undefined ? "" : data.consignment_type,
        sims_reg_no: data.sims_reg_no === undefined ? "" : data.sims_reg_no,
        pims_reg_no: data.pims_reg_no === undefined ? "" : data.pims_reg_no,
        nfmims_reg_no:
          data.nfmims_reg_no === undefined ? "" : data.nfmims_reg_no,
        sims_date: data.sims_date === undefined ? "" : data.sims_date,
        pims_date: data.pims_date === undefined ? "" : data.pims_date,
        nfmims_date: data.nfmims_date === undefined ? "" : data.nfmims_date,
        delivery_date:
          data.delivery_date === undefined ? "" : data.delivery_date,
        gateway_igm_date:
          data.gateway_igm_date === undefined ? "" : data.gateway_igm_date,
        hss: data.hss === undefined ? "" : data.hss,
        saller_name: data.saller_name === undefined ? "" : data.saller_name,
        adCode: data.adCode === undefined ? "" : data.adCode,
        bank_name: data.bank_name === undefined ? "" : data.bank_name,
        fristCheck: data.fristCheck === undefined ? "" : data.fristCheck,
        priorityJob:
          data.priorityJob === undefined ? "Normal" : data.priorityJob,
        emptyContainerOffLoadDate:
          data.emptyContainerOffLoadDate === undefined
            ? ""
            : data.emptyContainerOffLoadDate,
        job_net_weight:
          data.job_net_weight === undefined ? "" : data.job_net_weight,
        payment_method:
          data.payment_method === undefined
            ? "Transaction"
            : data.payment_method,
        gross_weight: data.gross_weight === undefined ? "" : data.gross_weight,
        fta_Benefit_date_time:
          data.fta_Benefit_date_time === undefined
            ? ""
            : data.fta_Benefit_date_time,
        be_no: data.be_no === undefined ? "" : data.be_no,
        in_bond_be_no:
          data.in_bond_be_no === undefined ? "" : data.in_bond_be_no,
        be_date: data.be_date === undefined ? "" : data.be_date,
        in_bond_be_date:
          data.in_bond_be_date === undefined ? "" : data.in_bond_be_date,
        discharge_date:
          data.discharge_date === undefined ? "" : data.discharge_date,
        assessment_date:
          data.assessment_date === undefined ? "" : data.assessment_date,
        examination_date:
          data.examination_date === undefined ? "" : data.examination_date,
        pcv_date: data.pcv_date === undefined ? "" : data.pcv_date,
        type_of_b_e: data.type_of_b_e === undefined ? "" : data.type_of_b_e,
        exBondValue: data.exBondValue === undefined ? "" : data.exBondValue,
        scheme: data.scheme === undefined ? "" : data.scheme,
        clearanceValue:
          data.clearanceValue === undefined ? "" : data.clearanceValue,
        duty_paid_date:
          data.duty_paid_date === undefined ? "" : data.duty_paid_date,
        do_copies: data.do_copies === undefined ? [] : data.do_copies,
        do_queries: data.do_queries === undefined ? [] : data.do_queries,
        documentationQueries:
          data.documentationQueries === undefined
            ? []
            : data.documentationQueries,
        submissionQueries:
          data.submissionQueries === undefined ? [] : data.submissionQueries,
        eSachitQueries:
          data.eSachitQueries === undefined ? [] : data.eSachitQueries,
        processed_be_attachment:
          data.processed_be_attachment === undefined
            ? []
            : data.processed_be_attachment,
        ooc_copies: data.ooc_copies === undefined ? [] : data.ooc_copies,
        in_bond_ooc_copies:
          data.in_bond_ooc_copies === undefined ? [] : data.in_bond_ooc_copies,
        gate_pass_copies:
          data.gate_pass_copies === undefined ? [] : data.gate_pass_copies,
        all_documents:
          data.all_documents === undefined ? [] : data.all_documents,
        do_revalidation:
          data.do_revalidation === undefined ? false : data.do_revalidation,
        do_revalidation_date:
          data.do_revalidation_date === undefined
            ? ""
            : data.do_revalidation_date,
        documentation_completed_date_time:
          data.documentation_completed_date_time === undefined
            ? ""
            : data.documentation_completed_date_time,
        submission_completed_date_time:
          data.submission_completed_date_time === undefined
            ? ""
            : data.submission_completed_date_time,
        completed_operation_date:
          data.completed_operation_date === undefined
            ? ""
            : data.completed_operation_date,
        esanchit_completed_date_time:
          data.esanchit_completed_date_time === undefined
            ? ""
            : data.esanchit_completed_date_time,
        bill_document_sent_to_accounts:
          data.bill_document_sent_to_accounts === undefined
            ? ""
            : data.bill_document_sent_to_accounts,
        do_completed: data.do_completed === undefined ? "" : data.do_completed,
        out_of_charge:
          data.out_of_charge === undefined ? "" : data.out_of_charge,
        checked: data.checked || false, // Make sure to set the checkbox state
        type_of_Do: data.type_of_Do || "",
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
      const earliestDate = updatedDate.reduce((earliest, current) => {
        return current < earliest ? current : earliest;
      }, "9999-12-31"); // Set a far future date as the initial value

      // Set do_validity_upto_job_level to the earliest date
      formik.setFieldValue(
        "do_validity_upto_job_level",
        earliestDate === "9999-12-31"
          ? data.do_validity_upto_job_level
          : earliestDate
      );
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

    const photoUrl = await handleFileUpload(
      file,
      formattedDocumentName,
      setFileSnackbar
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
  };
}

export default useFetchJobDetails;
