import * as React from "react";
import MenuItem from "@mui/material/MenuItem";
import { TextField, IconButton } from "@mui/material";
import { useFormik } from "formik";
import axios from "axios";
import { useParams } from "react-router-dom";
import { handleFileUpload } from "../../utils/awsFileUpload";
import Snackbar from "@mui/material/Snackbar";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Row, Col } from "react-bootstrap";

function EditBillingSheet() {
  const [data, setData] = React.useState(null);
  const { _id } = useParams();

  // Fetch data when the component is mounted
  React.useEffect(() => {
    async function getData() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
        );
        console.log("Fetched Data:", res.data); // Check if this matches the expected structure
        setData(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    getData();
  }, [_id]);

  // Copy text to clipboard
  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        console.log("Copied to clipboard:", text);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Fallback copied to clipboard:", text);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div style={{ margin: "20px 0" }}>
      {data ? (
        <div>
          <div className="job-details-container">
            <Row>
              <h4>
                Job Number: {data.be_no || "N/A"} | Custom House:{" "}
                {data.custom_house || "N/A"}
              </h4>
            </Row>
            <Row className="job-detail-row">
              <Col xs={12} lg={5}>
                <strong>Importer: </strong>
                <span className="non-editable-text">
                  {data.importer || "N/A"}
                </span>
              </Col>
            </Row>
            <Row className="job-detail-row">
              <Col xs={12} lg={5}>
                <strong>Importer Address: </strong>
                <span className="non-editable-text">
                  {data.importer_address || "N/A"}
                </span>
                <IconButton
                  size="small"
                  onClick={(event) =>
                    handleCopy(event, data.importer_address || "")
                  }
                >
                  <abbr title="Copy Importer Address">
                    <ContentCopyIcon fontSize="inherit" />
                  </abbr>
                </IconButton>
              </Col>
            </Row>
          </div>
        </div>
      ) : (
        <p>Loading data...</p>
      )}
    </div>
  );
}

// function EditBillingSheet() {
//   const [data, setData] = React.useState();
//   const [fileSnackbar, setFileSnackbar] = React.useState(false);
//   const { _id } = useParams();
//   function getCurrentDate() {
//     var currentDate = new Date();

//     var year = currentDate.getFullYear();
//     var month = ("0" + (currentDate.getMonth() + 1)).slice(-2); // Adding 1 because months are zero-based
//     var day = ("0" + currentDate.getDate()).slice(-2);

//     var formattedDate = year + "-" + month + "-" + day;
//     return formattedDate;
//   }

//   var currentDate = getCurrentDate();

//   React.useEffect(() => {
//     async function getData() {
//       const res = await axios(
//         `${process.env.REACT_APP_API_STRING}/get-job-by-id/${_id}`
//       );
//       setData(res.data);
//     }

//     getData();
//   }, [_id]);

//   console.log(data);

//   const formik = useFormik({
//     initialValues: {
//       icd_cfs_invoice: "",
//       icd_cfs_invoice_img: [],
//       other_invoices_img: [],
//       bill_document_sent_to_accounts: currentDate,
//       shipping_line_invoice_imgs: [],
//     },

//     onSubmit: async (values, { resetForm }) => {
//       const data = {
//         icd_cfs_invoice: values.icd_cfs_invoice,
//         bill_document_sent_to_accounts: values.bill_document_sent_to_accounts,
//         other_invoices_img: values.other_invoices_img,
//         shipping_line_invoice_imgs: values.shipping_line_invoice_imgs,
//         _id,
//       };

//       const res = await axios.post(
//         `${process.env.REACT_APP_API_STRING}/update-do-billing`,
//         data
//       );
//       alert(res.data.message);
//       resetForm();
//     },
//   });

//   React.useEffect(() => {
//     if (data) {
//       formik.setValues(data);
//     }
//     // eslint-disable-next-line
//   }, [data]);

//   //
//   const handleCopy = (event, text) => {
//     // Optimized handleCopy function using useCallback to avoid re-creation on each render

//     event.stopPropagation();

//     if (
//       navigator.clipboard &&
//       typeof navigator.clipboard.writeText === "function"
//     ) {
//       navigator.clipboard
//         .writeText(text)
//         .then(() => {
//           console.log("Text copied to clipboard:", text);
//         })
//         .catch((err) => {
//           alert("Failed to copy text to clipboard.");
//           console.error("Failed to copy:", err);
//         });
//     } else {
//       // Fallback approach for older browsers
//       const textArea = document.createElement("textarea");
//       textArea.value = text;
//       document.body.appendChild(textArea);
//       textArea.focus();
//       textArea.select();
//       try {
//         document.execCommand("copy");
//         console.log("Text copied to clipboard using fallback method:", text);
//       } catch (err) {
//         alert("Failed to copy text to clipboard.");
//         console.error("Fallback copy failed:", err);
//       }
//       document.body.removeChild(textArea);
//     }
//   };
//   //

//   return (
//     <div style={{ margin: "20px 0" }}>
//       {data && (
//         <div>
//           <div className="job-details-container">
//             <Row>
//               <h4>
//                 Job Number:&nbsp;{data.be_no}&nbsp;|&nbsp;
//                 {data && `Custom House: ${data.custom_house}`}
//               </h4>
//             </Row>

//             <Row className="job-detail-row">
//               <Col xs={12} lg={5}>
//                 <strong>Importer:&nbsp;</strong>
//                 <span className="non-editable-text">{data.importer}</span>
//               </Col>
//             </Row>
//             <Row className="job-detail-row">
//               <Col xs={12} lg={5}>
//                 <strong>Importer Address:&nbsp;</strong>
//                 <span className="non-editable-text">
//                   {data.importer_address}
//                 </span>
//                 <IconButton
//                   size="small"
//                   onClick={(event) => handleCopy(event, data.importer_address)}
//                 >
//                   <abbr title="Copy Importer Address">
//                     <ContentCopyIcon fontSize="inherit" />
//                   </abbr>
//                 </IconButton>
//               </Col>
//             </Row>
//           </div>
//         </div>
//       )}

//       <form onSubmit={formik.handleSubmit}>
//         <h5>Job Number: {data?.job_no}</h5>
//         <h5>Importer: {data?.importer}</h5>
//         {data && data?.custom_house === "ICD Sabarmati, Ahmedabad" ? (
//           <TextField
//             select
//             fullWidth
//             size="small"
//             margin="normal"
//             variant="outlined"
//             id="icd_cfs_invoice"
//             name="icd_cfs_invoice"
//             label="ICD CFS invoice"
//             value={formik.values.icd_cfs_invoice}
//             onChange={formik.handleChange}
//           >
//             <MenuItem value="No">No</MenuItem>
//             <MenuItem value="Yes">Yes</MenuItem>
//           </TextField>
//         ) : (
//           ""
//         )}

//         <label htmlFor="utr" className="btn">
//           Upload ICD CFS Invoices
//         </label>
//         <input
//           type="file"
//           multiple
//           name="icd_cfs_invoice_img"
//           id="icd_cfs_invoice_img"
//           onChange={(e) =>
//             handleFileUpload(
//               e,
//               "icd_cfs_invoice_img",
//               "icd_cfs_invoice_img",
//               formik,
//               setFileSnackbar
//             )
//           }
//           style={{ display: "none" }}
//         />
//         <br />
//         {formik.values.icd_cfs_invoice_img?.map((file, index) => {
//           return (
//             <div key={index}>
//               <a href={file}>{file}</a>
//               <br />
//             </div>
//           );
//         })}
//         <br />

//         {/* Upload Other Invoices */}
//         <label htmlFor="other_invoices_img" className="btn">
//           Upload Other Invoices
//         </label>
//         <input
//           type="file"
//           multiple
//           name="other_invoices_img"
//           id="other_invoices_img"
//           onChange={(e) =>
//             handleFileUpload(
//               e,
//               "other_invoices_img",
//               "other_invoices_img",
//               formik,
//               setFileSnackbar
//             )
//           }
//           style={{ display: "none" }}
//         />
//         <br />
//         <br />
//         {formik.values.other_invoices_img?.map((file, index) => {
//           return (
//             <div key={index}>
//               <a href={file}>{file}</a>
//               <br />
//             </div>
//           );
//         })}
//         <br />

//         {/* Upload Shipping Line Invoices */}
//         <label htmlFor="shipping_line_invoice_imgs" className="btn">
//           Upload Shipping Line Invoices
//         </label>
//         <input
//           type="file"
//           multiple
//           name="shipping_line_invoice_imgs"
//           id="shipping_line_invoice_imgs"
//           onChange={(e) =>
//             handleFileUpload(
//               e,
//               "shipping_line_invoice_imgs",
//               "shipping_line_invoice_imgs",
//               formik,
//               setFileSnackbar
//             )
//           }
//           style={{ display: "none" }}
//         />
//         <br />
//         <br />
//         {formik.values.shipping_line_invoice_imgs?.map((file, index) => {
//           return (
//             <div key={index}>
//               <a href={file}>{file}</a>
//               <br />
//             </div>
//           );
//         })}

//         <TextField
//           type="date"
//           fullWidth
//           size="small"
//           margin="normal"
//           variant="outlined"
//           id="bill_document_sent_to_accounts"
//           name="bill_document_sent_to_accounts"
//           label="Bill document sent to accounts team"
//           value={formik.values.bill_document_sent_to_accounts}
//           onChange={formik.handleChange}
//           InputLabelProps={{ shrink: true }}
//         />

//         <button type="submit" className="btn">
//           Submit
//         </button>
//       </form>

//       <Snackbar
//         open={fileSnackbar}
//         message={"File uploaded successfully!"}
//         sx={{ left: "auto !important", right: "24px !important" }}
//       />
//     </div>
//   );
// }

export default React.memo(EditBillingSheet);
