// JobStickerPDF.js
import React, { forwardRef, useImperativeHandle } from "react";
import jsPDF from "jspdf";
import { Modal, Row, Col } from "react-bootstrap";
import "jspdf-autotable";
import logo from "../../assets/DSR/sticker.jpg"; // Ensure this path is correct

const JobStickerPDF = forwardRef(({ jobData, data }, ref) => {
  /**
   * Expose the generatePdf function to the parent via ref
   */
  useImperativeHandle(ref, () => ({
    /**
     * Generates the PDF and returns it as a Blob.
     * @returns {Promise<Blob>}
     */
    generatePdf: () => {
      return new Promise((resolve, reject) => {
        try {
          const doc = new jsPDF({
            orientation: "p",
            unit: "pt",
            format: "a4",
          });

          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // Define margins
          const leftMargin = 40;
          const rightMargin = 40;
          const topMargin = 40;
          const bottomMargin = 40;

          // Calculate available width
          const availableWidth = pageWidth - leftMargin - rightMargin;

          // Load and add the logo image
          const img = new Image();
          img.src = logo;

          img.onload = () => {
            try {
              console.log("Logo image loaded successfully.");
              const imgWidth = img.width;
              const imgHeight = img.height;
              const aspectRatio = imgHeight / imgWidth;

              const logoWidth = availableWidth;
              const logoHeight = logoWidth * aspectRatio;

              // JOB NO. AMD/IMP/SEA/{job_no}/{year} centered at the top
              const jobNumberText = `JOB NO. AMD/IMP/SEA/${data.job_no}/${data.year}`;
              doc.setFontSize(16);
              doc.setFont("helvetica", "bold");
              const jobNumberWidth = doc.getTextWidth(jobNumberText);
              const jobNumberX = (pageWidth - jobNumberWidth) / 2;
              const jobNumberY = topMargin + 15; // Position at top margin + offset
              doc.text(jobNumberText, jobNumberX, jobNumberY);

              // Add Logo below the job number
              const logoX = leftMargin;
              const logoY = jobNumberY + 20; // Space below job number
              doc.addImage(img, "JPEG", logoX, logoY, logoWidth, logoHeight);

              // Initialize current Y position for content
              let currentY = logoY + logoHeight + 30; // Space below the logo

              /**
               * Helper function to add a two-column row with borders
               * @param {string} label1 - Label for the first column
               * @param {string} value1 - Value for the first column
               * @param {string} label2 - Label for the second column
               * @param {string} value2 - Value for the second column
               */
              const addTwoColumnRow = (label1, value1, label2, value2) => {
                const labelWidth = 100; // Fixed width for labels
                const gap = 20; // Gap between columns

                // First Column
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`${label1}:`, leftMargin, currentY);
                doc.setFont("helvetica", "normal");
                doc.text(`${value1}`, leftMargin + labelWidth + 10, currentY);

                // Second Column
                doc.setFont("helvetica", "bold");
                doc.text(
                  `${label2}:`,
                  leftMargin + availableWidth / 2 + gap,
                  currentY
                );
                doc.setFont("helvetica", "normal");
                doc.text(
                  `${value2}`,
                  leftMargin + availableWidth / 2 + gap + labelWidth + 10,
                  currentY
                );

                // Draw horizontal line for the row border
                doc.setLineWidth(0.5);
                doc.line(
                  leftMargin,
                  currentY + 5,
                  pageWidth - rightMargin,
                  currentY + 5
                );

                currentY += 25; // Move to next line with spacing
              };

              /**
               * Helper function to add a single-column row with borders
               * @param {string} label - Label for the row
               * @param {string} value - Value for the row
               */
              const addSingleColumnRow = (label, value) => {
                const labelWidth = 100; // Fixed width for labels

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, leftMargin, currentY);
                doc.setFont("helvetica", "normal");
                doc.text(`${value}`, leftMargin + labelWidth + 10, currentY);

                // Draw horizontal line for the row border
                doc.setLineWidth(0.5);
                doc.line(
                  leftMargin,
                  currentY + 5,
                  pageWidth - rightMargin,
                  currentY + 5
                );

                currentY += 25; // Move to next line with spacing
              };

              // Add General Job Details with mixed column layouts
              // Row 1: Single Column (Importer)
              addSingleColumnRow("Importer", data.importer || "N/A");

              // Row 2: Two Columns (BE No & BE Date)
              addTwoColumnRow(
                "BE No",
                jobData.be_no || "N/A",
                "BE Date",
                jobData.be_date || "N/A"
              );

              // Row 3: Two Columns (Invoice Number & Invoice Date)
              addTwoColumnRow(
                "Invoice NO.",
                data.invoice_number || "N/A",
                "Invoice Date",
                data.invoice_date || "N/A"
              );

              // Row 4: Two Columns (Loading Port & Number of Packages)
              addTwoColumnRow(
                "Loading Port",
                data.loading_port || "N/A",
                "Packages",
                data.no_of_pkgs || "N/A"
              );

              // Row 5: Single Column (Description)
              addSingleColumnRow("Description", jobData.description || "N/A");

              // Row 6: Two Columns (Gross Weight & Net Weight)
              addTwoColumnRow(
                "Gross Weight",
                jobData.gross_weight || "N/A",
                "Net Weight",
                jobData.job_net_weight || "N/A"
              );

              // Row 7: Two Columns (Gateway IGM & Gateway IGM Date)
              addTwoColumnRow(
                "Gateway IGM",
                data.gateway_igm || "N/A",
                "Gateway IGM Date",
                data.gateway_igm_date || "N/A"
              );

              // Row 8: Two Columns (Local IGM No & Local IGM Date)
              addTwoColumnRow(
                "Local IGM No",
                data.igm_no || "N/A",
                "Local IGM Date",
                data.igm_date || "N/A"
              );

              // Row 9: Two Columns (BL No & BL Date)
              addTwoColumnRow(
                "BL No",
                data.awb_bl_no || "N/A",
                "BL Date",
                data.awb_bl_date || "N/A"
              );

              // Row 10: Two Columns (Shipping Line/Airline & ICD)
              addTwoColumnRow(
                "Shipping Line",
                data.shipping_line_airline || "N/A",
                "ICD",
                data.custom_house || "N/A"
              );

              // Add some space before Container Details
              currentY += 10;

              // Container Details Header
              doc.setFontSize(14);
              doc.setFont("helvetica", "bold");
              doc.text("Container Details", leftMargin, currentY);
              currentY += 20;

              // Define Container Table Columns
              const containerColumns = [
                { header: "Container No", dataKey: "container_number" },
                { header: "Size", dataKey: "size" },
                { header: "Seal Number", dataKey: "seal_no" },
              ];

              // Prepare Container Data
              const containerData =
                jobData.container_nos && jobData.container_nos.length > 0
                  ? jobData.container_nos.map((container) => ({
                      container_number: container.container_number || "N/A",
                      size: container.size || "N/A",
                      seal_no: container.seal_no || "N/A",
                    }))
                  : [
                      {
                        container_number: "No containers available.",
                        size: "",
                        seal_no: "",
                      },
                    ];

              // Generate Container Table
              doc.autoTable({
                startY: currentY,
                head: [containerColumns.map((col) => col.header)],
                body: containerData.map((row) => [
                  row.container_number,
                  row.size,
                  row.seal_no,
                ]),
                styles: { fontSize: 12, cellPadding: 5 },
                headStyles: {
                  fillColor: [52, 58, 64],
                  textColor: 255,
                  fontStyle: "bold",
                  halign: "center",
                },
                bodyStyles: {
                  halign: "center",
                },
                columnStyles: {
                  0: { cellWidth: 150 },
                  1: { cellWidth: 100 },
                  2: { cellWidth: 150 },
                },
                theme: "striped",
                alternateRowStyles: { fillColor: [248, 249, 250] },
                margin: { left: leftMargin, right: rightMargin },
              });

              // Update currentY after the container table
              currentY = doc.lastAutoTable.finalY + 20;

              // Add Footer with Page Number
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
              console.log("PDF generated successfully:", pdfBlob);
              resolve(pdfBlob);
            } catch (error) {
              console.error("Error generating PDF:", error);
              alert(`Error generating PDF: ${error.message}`);
              reject(error);
            }
          };

          img.onerror = (error) => {
            console.error("Error loading logo image:", error);
            alert("Failed to load logo image. Please try again.");
            reject(error);
          };
        } catch (error) {
          console.error("Error generating PDF:", error);
          reject(error);
        }
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
            <strong style={{ color: "#495057" }}>Shipping Line:</strong>
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
});

export default JobStickerPDF;
