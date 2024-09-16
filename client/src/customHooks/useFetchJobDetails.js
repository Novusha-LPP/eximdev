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
      Bucket: "alvision-exim-images",
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
  ]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  const additionalDocs = [
    {
      document_name: "Pre-Shipment Inspection Certificate",
      document_code: "856001",
    },
    { document_name: "Form 9 & Form 6", document_code: "856001" },
    {
      document_name: "Registration Document (SIMS/NFMIMS/PIMS)",
      document_code: "101000",
    },
    { document_name: "Certificate of Analysis", document_code: "001000" },
  ];

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
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-docs`
      );
      setDocuments(res.data);
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
        console.log(Array.isArray(cthRes.data));
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
      discharge_date: "",
      status: "",
      detailed_status: "",
      free_time: "",
      arrival_date: "",
      do_validity: "",
      do_validity_upto_job_level: "",
      do_revalidation_upto_job_level: "",
      checklist: [],
      remarks: "",
      description: "",
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
      do_copies: [],
      do_queries: [],
      documentationQueries: [],
      submissionQueries: [],
      eSachitQueries: [],
      processed_be_attachment: [],
      ooc_copies: [],
      gate_pass_copies: [],
      do_revalidation: false,
      do_revalidation_date: "",
      out_of_charge: "",
      checked: false,
    },
    onSubmit: async (values) => {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-job/${params.selected_year}/${params.job_no}`,
        {
          cth_documents: cthDocuments,
          documents: selectedDocuments,
          checkedDocs: values.checkedDocs,
          vessel_berthing: values.vessel_berthing,
          free_time: values.free_time,
          status: values.status,
          detailed_status: values.detailed_status,
          container_nos: values.container_nos,
          arrival_date: values.arrival_date,
          do_validity_upto_job_level: values.do_validity_upto_job_level,
          do_revalidation_upto_job_level: values.do_revalidation_upto_job_level,
          checklist: values.checklist,
          remarks: values.remarks,
          description: values.description,
          sims_reg_no: values.sims_reg_no,
          pims_reg_no: values.pims_reg_no,
          nfmims_reg_no: values.nfmims_reg_no,
          sims_date: values.sims_date,
          pims_date: values.pims_date,
          nfmims_date: values.nfmims_date,
          delivery_date: values.delivery_date,
          gateway_igm_date: values.gateway_igm_date,
          discharge_date: values.discharge_date,
          assessment_date: values.assessment_date,
          duty_paid_date: values.duty_paid_date,
          doPlanning: values.doPlanning,
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
          gate_pass_copies: values.gate_pass_copies,
          do_revalidation: values.do_revalidation,
          do_revalidation_date: values.do_revalidation_date,
          out_of_charge: values.out_of_charge,
          checked: values.checked,
          obl_telex_bl: values.obl_telex_bl,
          document_received_date: values.document_received_date,
        }
      );
      localStorage.setItem("tab_value", 1);
      setTabValue(1);
      navigate("/import-dsr");
    },
  });
  console.log(formik.values.do_validity_upto_job_level);
  const serializedContainerNos = useMemo(
    () =>
      JSON.stringify(
        formik.values.container_nos.map((container) => ({
          arrival_date: container.arrival_date,
          free_time: container.free_time,
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
        arrival_date:
          container.arrival_date === undefined
            ? ""
            : convertDateFormatForUI(container.arrival_date), // convert date to yyyy-mm-dd
        container_number: container.container_number,
        size: container.size === undefined ? "20" : container.size,
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
        weight_shortage:
          container.weight_shortage === undefined
            ? ""
            : container.weight_shortage,
        weight_excess:
          container.weight_excess === undefined ? "" : container.weight_excess,
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
        arrival_date: container_nos[0]?.arrival_date,
        vessel_berthing:
          data.vessel_berthing === undefined
            ? ""
            : new Date(data.vessel_berthing)
                .toLocaleDateString("en-CA")
                .split("/")
                .reverse()
                .join("-"),
        free_time: data.free_time === undefined ? 14 : data.free_time,
        status: data.status,
        detailed_status:
          data.detailed_status === undefined
            ? "Estimated Time of Arrival"
            : data.detailed_status,
        do_validity: data.do_validity === undefined ? "" : data.do_validity,
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
        remarks: data.remarks === undefined ? "" : data.remarks,
        description: data.description === undefined ? "" : data.description,
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
        discharge_date:
          data.discharge_date === undefined ? "" : data.discharge_date,
        assessment_date:
          data.assessment_date === undefined ? "" : data.assessment_date,
        examination_date:
          data.examination_date === undefined ? "" : data.examination_date,
        pcv_date: data.pcv_date === undefined ? "" : data.pcv_date,
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
        gate_pass_copies:
          data.gate_pass_copies === undefined ? [] : data.gate_pass_copies,
        do_revalidation:
          data.do_revalidation === undefined ? false : data.do_revalidation,
        do_revalidation_date:
          data.do_revalidation_date === undefined
            ? ""
            : data.do_revalidation_date,
        out_of_charge:
          data.out_of_charge === undefined ? "" : data.out_of_charge,
        checked:
          data.containers_arrived_on_same_date === undefined
            ? false
            : data.containers_arrived_on_same_date,
      });
    }
    // eslint-disable-next-line
  }, [data]);

  // Update detention from dates and do validity upto job level
  useEffect(() => {
    function addDaysToDate(dateString, days) {
      var date = new Date(dateString);
      date.setDate(date.getDate() + days);
      var year = date.getFullYear();
      var month = String(date.getMonth() + 1).padStart(2, "0");
      var day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    }

    if (formik.values.container_nos !== "" && data !== null) {
      let updatedDate = [];

      // If all containers do not arrive at the same time, use the arrival date of individual container
      if (!checked) {
        updatedDate = formik.values.container_nos?.map((container) =>
          addDaysToDate(
            container.arrival_date,
            parseInt(formik.values.free_time)
          )
        );
      } else {
        // If all containers arrive at the same time, use the common arrival date
        updatedDate = formik.values.container_nos?.map((container) =>
          addDaysToDate(
            formik.values.arrival_date,
            parseInt(formik.values.free_time)
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
  }, [formik.values.arrival_date, formik.values.free_time, data, checked]);

  const currentDate = new Date().toISOString().split("T")[0];

  // Set document_received_date to today if obl_telex_bl is not empty
  useEffect(() => {
    if (formik.values.obl_telex_bl !== "") {
      formik.setFieldValue("document_received_date", currentDate);
    } else {
      formik.setFieldValue("document_received_date", "");
    }
  }, [formik.values.obl_telex_bl]);

  // Set do_planning_date to today if doPlanning is true
  useEffect(() => {
    if (formik.values.doPlanning === true) {
      formik.setFieldValue("do_planning_date", currentDate);
    } else {
      formik.setFieldValue("do_planning_date", "");
    }
  }, [formik.values.doPlanning]);

  // Set do_revalidation_date to today if do_revalidation is true
  useEffect(() => {
    if (formik.values.do_revalidation === true) {
      formik.setFieldValue("do_revalidation_date", currentDate);
    } else {
      formik.setFieldValue("do_revalidation_date", "");
    }
  }, [formik.values.do_revalidation]);

  // Set examination_planning_date to today if examinationPlanning is true
  useEffect(() => {
    if (formik.values.examinationPlanning === true) {
      formik.setFieldValue("examination_planning_date", currentDate);
    } else {
      formik.setFieldValue("examination_planning_date", "");
    }
  }, [formik.values.examinationPlanning]);

  // Update detention from dates and set do_validity_upto_job_level
  useEffect(() => {
    function addDaysToDate(dateString, days) {
      const date = new Date(dateString);
      date.setDate(date.getDate() + days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function subtractDaysFromDate(dateString, days) {
      const date = new Date(dateString);
      date.setDate(date.getDate() - days);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (formik.values.container_nos !== "" && data !== null) {
      let updatedDate = [];

      // If all containers do not arrive at the same time, use the arrival date of individual container
      if (!checked) {
        updatedDate = formik.values.container_nos?.map((container) =>
          addDaysToDate(
            container.arrival_date,
            parseInt(formik.values.free_time)
          )
        );
      } else {
        // If all containers arrive at the same time, use the common arrival date
        updatedDate = formik.values.container_nos?.map((container) =>
          addDaysToDate(
            formik.values.arrival_date,
            parseInt(formik.values.free_time)
          )
        );
      }

      setDetentionFrom(updatedDate);

      // Find the earliest date from updatedDate
      const earliestDate = updatedDate.reduce((earliest, current) => {
        return current < earliest ? current : earliest;
      }, "9999-12-31"); // Set a far future date as the initial value

      // Subtract one day from the earliest date
      const doValidityDate =
        earliestDate === "9999-12-31"
          ? ""
          : subtractDaysFromDate(earliestDate, 1);

      // Set do_validity_upto_job_level to the calculated date
      formik.setFieldValue(
        "do_validity_upto_job_level",
        doValidityDate === "" ? data.do_validity_upto_job_level : doValidityDate
      );
    }
    // eslint-disable-next-line
  }, [
    formik.values.arrival_date,
    formik.values.free_time,
    data,
    checked,
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

    const photoUrl = await handleSingleFileUpload(
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
        url: newValue?.url || "", // or `newValue.url` if you get `url` in the `newValue`
      };

      return updatedDocuments;
    });
  };

  const handleAddDocument = () => {
    setSelectedDocuments([
      ...selectedDocuments,
      { document_name: "", document_code: "", url: "" },
    ]);
  };

  const handleRemoveDocument = (index) => {
    const newSelectedDocuments = [...selectedDocuments];
    newSelectedDocuments.splice(index, 1);
    setSelectedDocuments(newSelectedDocuments);
  };

  const filterDocuments = (selectedDocuments, currentIndex) => {
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

    return documents.filter((doc) => !restrictedDocs.has(doc.document_code));
  };

  return {
    data,
    detentionFrom,
    formik,
    cthDocuments,
    documents,
    handleFileChange,
    selectedDocuments,
    handleDocumentChange,
    handleAddDocument,
    handleRemoveDocument,
    filterDocuments,
  };
}

export default useFetchJobDetails;
