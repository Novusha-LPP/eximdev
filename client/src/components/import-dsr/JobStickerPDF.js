// JobStickerPDF.js
import React, { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../../assets/DSR/sticker.jpg"; // Ensure this path is correct

const JobStickerPDF = forwardRef(
  ({ jobData, onJobDataChange, errors, touched, data }, ref) => {
    /**
     * Expose the generatePdf function to the parent via ref
     */
    useImperativeHandle(ref, () => ({
      /**
       * Generates the PDF and returns it as a Blob
       * @returns {Promise<Blob>}
       */
      generatePdf: () => {
        return new Promise((resolve, reject) => {
          // Basic Validation
          if (!jobData.job_no.trim()) {
            alert("Job Number is required to generate the PDF.");
            reject(new Error("Job Number is missing"));
            return;
          }

          const doc = new jsPDF({
            orientation: "p",
            unit: "pt", // points
            format: "a4",
          });

          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Define margins
          const leftMargin = 20;
          const rightMargin = 20;
          const topMargin = 20;
          const bottomMargin = 20;

          // Calculate available width
          const availableWidth = pageWidth - leftMargin - rightMargin;

          // Create an Image object to get natural dimensions
          const img = new Image();
          img.src = logo;

          img.onload = () => {
            try {
              const imgWidth = img.width;
              const imgHeight = img.height;
              const aspectRatio = imgHeight / imgWidth;

              // Set logo width to availableWidth and calculate height to maintain aspect ratio
              const logoWidth = availableWidth;
              const logoHeight = logoWidth * aspectRatio;

              // Add the centered Job Number line above the logo
              const jobNumberText = `JOB NO. ${jobData.job_no} / ${jobData.year}`;
              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              const jobNumberWidth = doc.getTextWidth(jobNumberText);
              const jobNumberX = (pageWidth - jobNumberWidth) / 2; // Centered horizontally
              const jobNumberY = topMargin + 20; // 20 points below the top margin
              doc.text(jobNumberText, jobNumberX, jobNumberY);

              // Add the logo image below the job number
              const logoX = leftMargin;
              const logoY = jobNumberY + 10; // 10 points below the job number
              doc.addImage(logo, "PNG", logoX, logoY, logoWidth, logoHeight);

              // Add a title below the logo
              const titleText = "Job Sticker";
              doc.setFontSize(16);
              doc.setFont("helvetica", "bold");
              const titleWidth = doc.getTextWidth(titleText);
              const titleX = (pageWidth - titleWidth) / 2;
              const titleY = logoY + logoHeight + 20; // 20 points below the logo
              doc.text(titleText, titleX, titleY);

              // Prepare data for the table
              const tableHead = [["Field", "Value"]];
              const tableBody = [
                ["Importer", jobData.importer],
                ["BE No", jobData.be_no],
                ["BE Date", jobData.be_date],
                ["Invoice Number", jobData.invoice_number],
                ["Invoice Date", jobData.invoice_date],
                ["Loading Port", jobData.loading_port],
                ["Number of Packages", jobData.no_of_pkgs],
                ["Description", jobData.description],
                ["Gross Weight", jobData.gross_weight],
                ["Net Weight", jobData.job_net_weight],
                ["Gateway IGM", jobData.gateway_igm],
                ["Gateway IGM Date", jobData.gateway_igm_date],
                ["IGM No", jobData.igm_no],
                ["IGM Date", jobData.igm_date],
                ["Bill No", jobData.awb_bl_no],
                ["Bill Date", jobData.awb_bl_date],
                ["Shipping Line/Airline", jobData.shipping_line_airline],
                ["Custom House", jobData.custom_house],
                // Add more fields here if needed
              ];

              // Use jspdf-autotable to generate a table with your job data
              doc.autoTable({
                startY: titleY + 10, // 10 points below the title
                head: tableHead,
                body: tableBody,
                styles: { fontSize: 12, cellPadding: 5 },
                headStyles: {
                  fillColor: [22, 160, 133],
                  textColor: 255,
                  fontStyle: "bold",
                }, // Teal header with white text
                alternateRowStyles: { fillColor: [240, 240, 240] }, // Light grey for alternate rows
                columnStyles: {
                  0: { cellWidth: 150 }, // "Field" column width
                  1: { cellWidth: availableWidth - 150 }, // "Value" column adjusts based on available width
                },
                margin: { left: leftMargin, right: rightMargin },
              });

              // Add footer with page number
              const pageCount = doc.internal.getNumberOfPages();
              doc.setFontSize(10);
              for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(
                  `Page ${i} of ${pageCount}`,
                  pageWidth / 2,
                  pageHeight - 10,
                  { align: "center" }
                );
              }

              // Get PDF as Blob
              doc.output("blob").then((blob) => {
                resolve(blob);
              });
            } catch (error) {
              console.error("Error generating PDF:", error);
              reject(error);
            }
          };

          img.onerror = (error) => {
            console.error("Error loading logo image:", error);
            alert("Failed to load logo image. Please try again.");
            reject(error);
          };
        });
      },
    }));

    /**
     * Handles input changes so the parent component can update the jobData state.
     */
    const handleFieldChange = (e) => {
      const { name, value } = e.target;
      onJobDataChange(name, value);
    };

    return (
      <div
        style={{
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: "20px" }}>
          Job Sticker Preview
        </h3>

        {/* Job Number */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="job_no"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Job Number:
          </label>
          <input
            id="job_no"
            type="text"
            name="job_no"
            value={data.job_no}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.job_no && touched.job_no
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Job Number"
          />
        </div>
        {errors.job_no && touched.job_no && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.job_no}
          </div>
        )}

        {/* Year */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label htmlFor="year" style={{ width: "150px", fontWeight: "bold" }}>
            Year:
          </label>
          <input
            id="year"
            type="text"
            name="year"
            value={data.year}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.year && touched.year
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Year"
          />
        </div>
        {errors.year && touched.year && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.year}
          </div>
        )}

        {/* Importer */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="importer"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Importer:
          </label>
          <input
            id="importer"
            type="text"
            name="importer"
            value={data.importer}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.importer && touched.importer
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Importer"
          />
        </div>
        {errors.importer && touched.importer && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.importer}
          </div>
        )}

        {/* BE No */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label htmlFor="be_no" style={{ width: "150px", fontWeight: "bold" }}>
            BE No:
          </label>
          <input
            id="be_no"
            type="text"
            name="be_no"
            value={jobData.be_no}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.be_no && touched.be_no
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter BE No"
          />
        </div>
        {errors.be_no && touched.be_no && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.be_no}
          </div>
        )}

        {/* BE Date */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="be_date"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            BE Date:
          </label>
          <input
            id="be_date"
            type="date"
            name="be_date"
            value={jobData.be_date}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.be_date && touched.be_date
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
          />
        </div>
        {errors.be_date && touched.be_date && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.be_date}
          </div>
        )}

        {/* Invoice Number */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="invoice_number"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Invoice Number:
          </label>
          <input
            id="invoice_number"
            type="text"
            name="invoice_number"
            value={data.invoice_number}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.invoice_number && touched.invoice_number
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Invoice Number"
          />
        </div>
        {errors.invoice_number && touched.invoice_number && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.invoice_number}
          </div>
        )}

        {/* Invoice Date */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="invoice_date"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Invoice Date:
          </label>
          <input
            id="invoice_date"
            type="date"
            name="invoice_date"
            value={data.invoice_date}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.invoice_date && touched.invoice_date
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
          />
        </div>
        {errors.invoice_date && touched.invoice_date && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.invoice_date}
          </div>
        )}

        {/* Loading Port */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="loading_port"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Loading Port:
          </label>
          <input
            id="loading_port"
            type="text"
            name="loading_port"
            value={data.loading_port}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.loading_port && touched.loading_port
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Loading Port"
          />
        </div>
        {errors.loading_port && touched.loading_port && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.loading_port}
          </div>
        )}

        {/* Number of Packages */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="no_of_pkgs"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Number of Packages:
          </label>
          <input
            id="no_of_pkgs"
            type="number"
            name="no_of_pkgs"
            value={data.no_of_pkgs}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.no_of_pkgs && touched.no_of_pkgs
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Number of Packages"
          />
        </div>
        {errors.no_of_pkgs && touched.no_of_pkgs && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.no_of_pkgs}
          </div>
        )}

        {/* Description */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="description"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={jobData.description}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.description && touched.description
                  ? "1px solid red"
                  : "1px solid #ccc",
              resize: "vertical",
              height: "60px",
            }}
            placeholder="Enter Description"
          />
        </div>
        {errors.description && touched.description && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.description}
          </div>
        )}

        {/* Gross Weight */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="gross_weight"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Gross Weight:
          </label>
          <input
            id="gross_weight"
            type="number"
            name="gross_weight"
            value={jobData.gross_weight}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.gross_weight && touched.gross_weight
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Gross Weight"
          />
        </div>
        {errors.gross_weight && touched.gross_weight && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.gross_weight}
          </div>
        )}

        {/* Net Weight */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="job_net_weight"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Net Weight:
          </label>
          <input
            id="job_net_weight"
            type="number"
            name="job_net_weight"
            value={jobData.job_net_weight}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.job_net_weight && touched.job_net_weight
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Net Weight"
          />
        </div>
        {errors.job_net_weight && touched.job_net_weight && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.job_net_weight}
          </div>
        )}

        {/* Gateway IGM */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="gateway_igm"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Gateway IGM:
          </label>
          <input
            id="gateway_igm"
            type="text"
            name="gateway_igm"
            value={data.gateway_igm}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.gateway_igm && touched.gateway_igm
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Gateway IGM"
          />
        </div>
        {errors.gateway_igm && touched.gateway_igm && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.gateway_igm}
          </div>
        )}

        {/* Gateway IGM Date */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="gateway_igm_date"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Gateway IGM Date:
          </label>
          <input
            id="gateway_igm_date"
            type="date"
            name="gateway_igm_date"
            value={jobData.gateway_igm_date}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.gateway_igm_date && touched.gateway_igm_date
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
          />
        </div>
        {errors.gateway_igm_date && touched.gateway_igm_date && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.gateway_igm_date}
          </div>
        )}

        {/* IGM No */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="igm_no"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            IGM No:
          </label>
          <input
            id="igm_no"
            type="text"
            name="igm_no"
            value={data.igm_no}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.igm_no && touched.igm_no
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter IGM No"
          />
        </div>
        {errors.igm_no && touched.igm_no && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.igm_no}
          </div>
        )}

        {/* IGM Date */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="igm_date"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            IGM Date:
          </label>
          <input
            id="igm_date"
            type="date"
            name="igm_date"
            value={data.igm_date}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.igm_date && touched.igm_date
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
          />
        </div>
        {errors.igm_date && touched.igm_date && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.igm_date}
          </div>
        )}

        {/* Bill No */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="awb_bl_no"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Bill No:
          </label>
          <input
            id="awb_bl_no"
            type="text"
            name="awb_bl_no"
            value={data.awb_bl_no}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.awb_bl_no && touched.awb_bl_no
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Bill No"
          />
        </div>
        {errors.awb_bl_no && touched.awb_bl_no && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.awb_bl_no}
          </div>
        )}

        {/* Bill Date */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="awb_bl_date"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Bill Date:
          </label>
          <input
            id="awb_bl_date"
            type="date"
            name="awb_bl_date"
            value={data.awb_bl_date}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.awb_bl_date && touched.awb_bl_date
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
          />
        </div>
        {errors.awb_bl_date && touched.awb_bl_date && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.awb_bl_date}
          </div>
        )}

        {/* Shipping Line/Airline */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="shipping_line_airline"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Shipping Line/Airline:
          </label>
          <input
            id="shipping_line_airline"
            type="text"
            name="shipping_line_airline"
            value={data.shipping_line_airline}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.shipping_line_airline && touched.shipping_line_airline
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Shipping Line/Airline"
          />
        </div>
        {errors.shipping_line_airline && touched.shipping_line_airline && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.shipping_line_airline}
          </div>
        )}

        {/* Custom House */}
        <div
          style={{
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <label
            htmlFor="custom_house"
            style={{ width: "150px", fontWeight: "bold" }}
          >
            Custom House:
          </label>
          <input
            id="custom_house"
            type="text"
            name="custom_house"
            value={data.custom_house}
            onChange={handleFieldChange}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border:
                errors.custom_house && touched.custom_house
                  ? "1px solid red"
                  : "1px solid #ccc",
            }}
            placeholder="Enter Custom House"
          />
        </div>
        {errors.custom_house && touched.custom_house && (
          <div
            style={{ color: "red", marginBottom: "10px", marginLeft: "160px" }}
          >
            {errors.custom_house}
          </div>
        )}

        {/* Add more fields here following the same pattern */}
      </div>
    );
  }
);

export default JobStickerPDF;
