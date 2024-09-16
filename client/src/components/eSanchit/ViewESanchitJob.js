import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JobDetailsStaticData from "../import-dsr/JobDetailsStaticData";
import Snackbar from "@mui/material/Snackbar";
import AWS from "aws-sdk";
import { TextField } from "@mui/material";
import { Row, Col } from "react-bootstrap";

function ViewESanchitJob() {
  const [eSachitQueries, setESanchitQueries] = useState([
    { query: "", reply: "" },
  ]);
  const params = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
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
  const [snackbar, setSnackbar] = useState(false);
  const [fileSnackbar, setFileSnackbar] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const bl_no_ref = useRef();

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

  // Fetch data
  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-esanchit-job/${params.job_no}/${params.year}`
      );
      setData(res.data);
      setSelectedDocuments(res.data.documents);
    }

    getData();
  }, [params.job_no, params.year]);

  // Fetch CTH documents based on CTH number and Update additional CTH documents based on CTH number

  useEffect(() => {
    async function getCthDocs() {
      if (data?.cth_no) {
        const cthRes = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-cth-docs/${data?.cth_no}`
        );

        // Fetched CTH documents with URLs merged from data.cth_documents if they exist
        const fetchedCthDocuments = cthRes.data?.map((cthDoc) => {
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
        documentsToMerge = [...documentsToMerge, ...fetchedCthDocuments];

        // Merge data.cth_documents into the array
        documentsToMerge = [...documentsToMerge, ...data.cth_documents];

        // Eliminate duplicates, keeping only the document with a URL if it exists
        // const uniqueDocuments = documentsToMerge.reduce((acc, current) => {
        //   const existingDocIndex = acc.findIndex(
        //     (doc) => doc.document_name === current.document_name
        //   );

        //   if (existingDocIndex === -1) {
        //     // Document does not exist, add it
        //     return acc.concat([current]);
        //   } else {
        //     // Document exists, replace it only if the current one has a URL
        //     if (current.url) {
        //       acc[existingDocIndex] = current;
        //     }
        //     return acc;
        //   }
        // }, []);

        // setCthDocuments(uniqueDocuments);
        // Eliminate duplicates, keeping only the document with a URL if it exists
        const uniqueDocuments = documentsToMerge.reduce((acc, current) => {
          // Create a unique key based on document_name and document_code
          const uniqueKey = `${current.document_name} (${current.document_code})`;

          // Check if the document with this unique key already exists in the accumulator
          const existingDocIndex = acc.findIndex(
            (doc) => `${doc.document_name} (${doc.document_code})` === uniqueKey
          );

          if (existingDocIndex === -1) {
            // Document does not exist, add it
            return acc.concat([current]);
          } else {
            // Document exists, replace it only if the current one has a URL or has a document code
            if (current.url || current.document_code) {
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

  // Handle IRN change
  const handleIrnChange = (index, newIrn, isCth) => {
    if (isCth) {
      const updatedCthDocuments = [...cthDocuments];
      updatedCthDocuments[index].irn = newIrn;
      setCthDocuments(updatedCthDocuments);
    } else {
      const newSelectedDocuments = [...selectedDocuments];
      newSelectedDocuments[index].irn = newIrn;
      setSelectedDocuments(newSelectedDocuments);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    const formattedData = {
      cth_documents: [],
      documents: [],
      job_no: params.job_no,
      year: params.year,
      eSachitQueries: eSachitQueries,
    };

    // Add CTH documents with IRNs
    cthDocuments.forEach(({ document_name, document_code, url, irn }) => {
      if (url && url.length > 0) {
        formattedData.cth_documents.push({
          document_name: `${document_name}`,
          document_code: `${document_code}`,
          url: url,
          irn: irn || "", // Include IRN if it exists
        });
      }
    });

    // Add selected documents with IRNs
    selectedDocuments.forEach(({ document_name, document_code, url, irn }) => {
      if (url && url.length > 0) {
        formattedData.documents.push({
          document_name: `${document_name}`,
          document_code: `${document_code}`,
          url: url,
          irn: irn || "", // Include IRN if it exists
        });
      }
    });

    await axios.post(
      `${process.env.REACT_APP_API_STRING}/update-esanchit-job`,
      formattedData
    );
    navigate("/e-sanchit");
    console.log(formattedData);
  };

  // Handle sign documents
  const handleSignDocuments = async () => {
    try {
      const signRequests = selectedDocuments?.map(({ urls }) =>
        axios.post(`${process.env.REACT_APP_API_STRING}/sign-document`, {
          documentUrl: urls[0],
        })
      );

      const signedDocuments = await Promise.all(signRequests);

      signedDocuments.forEach(({ data }, index) => {
        selectedDocuments[index].urls[0] = data.signedUrl;
      });

      setSelectedDocuments([...selectedDocuments]);
      setSnackbar(true);

      setTimeout(() => {
        setSnackbar(false);
      }, 3000);
    } catch (error) {
      console.error("Error signing documents:", error);
    }
  };

  const addQuery = () => {
    setESanchitQueries([...eSachitQueries, { query: "", reply: "" }]);
  };

  const handleQueryChange = (event, index) => {
    const newQueries = [...eSachitQueries];
    newQueries[index].query = event.target.value;
    setESanchitQueries(newQueries);
  };

  return (
    <>
      <div style={{ margin: "20px 0" }}>
        {data && (
          <>
            <JobDetailsStaticData
              data={data}
              params={params}
              bl_no_ref={bl_no_ref}
              setSnackbar={setSnackbar}
            />
            <div className="job-details-container">
              <h4>Documents</h4>
              {cthDocuments &&
                cthDocuments?.map((doc, index) => (
                  <Row key={index} className="document-upload">
                    <Col xs={5}>
                      <strong>
                        {doc.document_name} ({doc.document_code})&nbsp;
                      </strong>
                    </Col>
                    <Col xs={3}>{doc.url && <a href={doc.url}>View</a>}</Col>
                    <Col>
                      <TextField
                        size="small"
                        label="IRN"
                        value={doc.irn || ""}
                        onChange={(e) =>
                          handleIrnChange(index, e.target.value, true)
                        }
                        disabled={!doc.url}
                      />
                    </Col>
                    <br />
                    <br />
                  </Row>
                ))}

              {selectedDocuments?.map((selectedDocument, index) => (
                <Row key={index} style={{ marginTop: "20px" }}>
                  <Col xs={5}>
                    <strong>
                      {selectedDocument.document_name} (
                      {selectedDocument.document_code})&nbsp;
                    </strong>
                  </Col>
                  <Col xs={3}>
                    {selectedDocument.url && (
                      <a href={selectedDocument.url}>View</a>
                    )}
                  </Col>
                  <Col>
                    <TextField
                      size="small"
                      label="IRN"
                      value={selectedDocument.irn}
                      onChange={(e) =>
                        handleIrnChange(index, e.target.value, false)
                      }
                    />
                  </Col>
                </Row>
              ))}
            </div>

            <div className="job-details-container">
              <h4>Queries</h4>
              {eSachitQueries?.map((item, id) => {
                return (
                  <Row key={id}>
                    <Col>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Query"
                        value={item.query} // Set the current query value
                        onChange={(e) => handleQueryChange(e, id)} // Handle changes
                      />
                    </Col>
                    <Col>
                      {item.reply}
                      <br />
                      <br />
                    </Col>
                  </Row>
                );
              })}
              <button onClick={addQuery} className="btn">
                Add Query
              </button>
            </div>

            <button
              className="btn"
              style={{ float: "right", margin: "20px" }}
              onClick={handleSubmit}
            >
              Submit
            </button>
            <button
              className="btn"
              style={{ float: "right", margin: "20px" }}
              onClick={handleSignDocuments}
            >
              Sign Documents
            </button>

            <br />
            <br />
            <Snackbar
              open={snackbar || fileSnackbar}
              message={
                snackbar ? "Copied to clipboard" : "File uploaded successfully!"
              }
              sx={{ left: "auto !important", right: "24px !important" }}
              onClose={() => {
                setSnackbar(false);
                setFileSnackbar(false);
              }}
            />
          </>
        )}
      </div>
    </>
  );
}

export default ViewESanchitJob;
