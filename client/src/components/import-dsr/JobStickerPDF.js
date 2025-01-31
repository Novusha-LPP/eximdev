// JobStickerPDF.js
import React, { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import { Modal, Row, Col } from "react-bootstrap";
import "jspdf-autotable";
import logo from "../../assets/DSR/sticker.jpg"; // Ensure this path is correct

const JobStickerPDF = forwardRef(
  ({ jobData, data }, ref) => {
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
              const jobNumberText = `JOB NO. ${jobData.job_no} / ${data.year}`;
              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              const jobNumberWidth = doc.getTextWidth(jobNumberText);
              const jobNumberX = (pageWidth - jobNumberWidth) / 2; // Centered horizontally
              const jobNumberY = topMargin + 20; // 20 points below the top margin
              doc.text(jobNumberText, jobNumberX, jobNumberY);

              // Add the logo image below the job number
              const logoX = leftMargin;
              const logoY = jobNumberY + 10; // 10 points below the job number
              doc.addImage(logo, "JPEG", logoX, logoY, logoWidth, logoHeight);

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
                ["Job Number", jobData.job_no || "N/A"],
                ["Year", data.year || "N/A"],
                ["Importer", data.importer || "N/A"],
                ["BE No", jobData.be_no || "N/A"],
                ["BE Date", jobData.be_date || "N/A"],
                ["Invoice Number", data.invoice_number || "N/A"],
                ["Invoice Date", data.invoice_date || "N/A"],
                ["Loading Port", data.loading_port || "N/A"],
                ["Number of Packages", data.no_of_pkgs || "N/A"],
                ["Description", jobData.description || "N/A"],
                ["Gross Weight", jobData.gross_weight || "N/A"],
                ["Net Weight", jobData.job_net_weight || "N/A"],
                ["Gateway IGM", data.gateway_igm || "N/A"],
                ["Gateway IGM Date", jobData.gateway_igm_date || "N/A"],
                ["Local IGM No", data.igm_no || "N/A"],
                ["Local IGM Date", data.igm_date || "N/A"],
                ["BL No", data.awb_bl_no || "N/A"],
                ["BL Date", data.awb_bl_date || "N/A"],
                ["Shipping Line/Airline", data.shipping_line_airline || "N/A"],
                ["ICD", data.custom_house || "N/A"],
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

              // Add Container Details Table
              const containerStartY = doc.lastAutoTable.finalY + 20; // 20 points below the previous table

              // Define container table headers and body
              const containerHead = [["Container No", "Size", "Seal Number"]];
              const containerBody = jobData.container_nos && jobData.container_nos.length > 0
                ? jobData.container_nos.map(container => [
                    container.container_number || "N/A",
                    container.size || "N/A",
                    container.seal_no || "N/A",
                  ])
                : [["No containers available.", "", ""]];

              // Generate container table
              doc.autoTable({
                startY: containerStartY,
                head: containerHead,
                body: containerBody,
                styles: { fontSize: 12, cellPadding: 5 },
                headStyles: {
                  fillColor: [52, 58, 64],
                  textColor: 255,
                  fontStyle: "bold",
                }, // Dark header with white text
                alternateRowStyles: { fillColor: [248, 249, 250] }, // Light grey for alternate rows
                columnStyles: {
                  0: { cellWidth: 150 },
                  1: { cellWidth: 100 },
                  2: { cellWidth: 150 },
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
              const pdfBlob = doc.output("blob");
              resolve(pdfBlob);
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

    return (
      <div
        style={{
          border: "1px solid #dee2e6",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          backgroundColor: "#ffffff",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            marginBottom: "30px",
            color: "#343a40",
          }}
        >
          JOB NO. AMD/IMP/SEA/{data.job_no}/{data.year}
        </h3>
        {/* Logo Section */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src={logo}
            alt="Company Logo"
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "100%", // Optional: Set a maximum width for the logo
            }}
          />
        </div>
        {/* General Job Details */}
        <div>
          {/* Row 1: Job Number & Year */}
          <Row style={{ borderBottom: "1px solid #dee2e6", padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Job Number:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.job_no || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Year:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.year || "N/A"}
              </span>
            </Col>
          </Row>

          {/* Row 2: Importer */}
          <Row
            style={{
              borderBottom: "1px solid #dee2e6",
              padding: "10px 0",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Col xs={12} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Importer:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.importer || "N/A"}
              </span>
            </Col>
          </Row>

          {/* Row 3: BE No & BE Date */}
          <Row style={{ borderBottom: "1px solid #dee2e6", padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>BE No:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.be_no || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>BE Date:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.be_date}
              </span>
            </Col>
          </Row>

          {/* Row 4: Invoice Number & Invoice Date */}
          <Row
            style={{
              borderBottom: "1px solid #dee2e6",
              padding: "10px 0",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Invoice Number:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.invoice_number || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Invoice Date:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.invoice_date}
              </span>
            </Col>
          </Row>

          {/* Row 5: Loading Port & Number of Packages */}
          <Row style={{ borderBottom: "1px solid #dee2e6", padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Loading Port:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.loading_port || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Number of Packages:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.no_of_pkgs || "N/A"}
              </span>
            </Col>
          </Row>

          {/* Row 6: Description */}
          <Row
            style={{
              borderBottom: "1px solid #dee2e6",
              padding: "10px 0",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Col xs={12} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Description:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.description || "N/A"}
              </span>
            </Col>
          </Row>

          {/* Row 7: Gross Weight & Net Weight */}
          <Row style={{ borderBottom: "1px solid #dee2e6", padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Gross Weight:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.gross_weight || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Net Weight:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.job_net_weight || "N/A"}
              </span>
            </Col>
          </Row>

          {/* Row 8: Gateway IGM & Gateway IGM Date */}
          <Row
            style={{
              borderBottom: "1px solid #dee2e6",
              padding: "10px 0",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Gateway IGM:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.gateway_igm || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Gateway IGM Date:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {jobData.gateway_igm_date}
              </span>
            </Col>
          </Row>

          {/* Row 9: Local IGM No & Local IGM Date */}
          <Row style={{ borderBottom: "1px solid #dee2e6", padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Local IGM No:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.igm_no || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>Local IGM Date:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.igm_date}
              </span>
            </Col>
          </Row>

          {/* Row 10: BL No & BL Date */}
          <Row
            style={{
              borderBottom: "1px solid #dee2e6",
              padding: "10px 0",
              backgroundColor: "#f8f9fa",
            }}
          >
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>BL No:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.awb_bl_no || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>BL Date:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.awb_bl_date}
              </span>
            </Col>
          </Row>

          {/* Row 11: Shipping Line/Airline & ICD */}
          <Row style={{ padding: "10px 0" }}>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>
                Shipping Line/Airline:
              </strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.shipping_line_airline || "N/A"}
              </span>
            </Col>
            <Col xs={12} lg={6} style={{ padding: "10px" }}>
              <strong style={{ color: "#495057" }}>ICD:</strong>
              <span style={{ marginLeft: "10px", color: "#212529" }}>
                {data.custom_house || "N/A"}
              </span>
            </Col>
          </Row>
        </div>

        {/* Container Numbers Section */}
        <div style={{ marginTop: "40px" }}>
          <h4 style={{ marginBottom: "20px", color: "#343a40" }}>
            Container Details
          </h4>

          {/* Header Row */}
          <Row
            style={{
              backgroundColor: "#343a40",
              color: "#ffffff",
              padding: "12px 0",
              borderRadius: "5px",
            }}
          >
            <Col xs={12} lg={4} style={{ textAlign: "center" }}>
              <strong>CONTAINER NO</strong>
            </Col>
            <Col xs={12} lg={4} style={{ textAlign: "center" }}>
              <strong>SIZE</strong>
            </Col>
            <Col xs={12} lg={4} style={{ textAlign: "center" }}>
              <strong>SEAL NUMBER</strong>
            </Col>
          </Row>

          {/* Container Rows */}
          {jobData.container_nos && jobData.container_nos.length > 0 ? (
            jobData.container_nos.map((container, index) => (
              <Row
                key={index}
                style={{
                  padding: "10px 0",
                  backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#ffffff",
                  borderBottom: "1px solid #dee2e6",
                }}
              >
                <Col xs={12} lg={4} style={{ textAlign: "center" }}>
                  {container.container_number || "N/A"}
                </Col>
                <Col xs={12} lg={4} style={{ textAlign: "center" }}>
                  {container.size || "N/A"}
                </Col>
                <Col xs={12} lg={4} style={{ textAlign: "center" }}>
                  {container.seal_no || "N/A"}
                </Col>
              </Row>
            ))
          ) : (
            <Row style={{ padding: "10px 0", backgroundColor: "#f8f9fa" }}>
              <Col xs={12} style={{ textAlign: "center", color: "#6c757d" }}>
                No containers available.
              </Col>
            </Row>
          )}
        </div>
      </div>
    );
  }
);

export default JobStickerPDF;
