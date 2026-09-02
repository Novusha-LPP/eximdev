import React, { useRef, useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return String(d);
  }
};

function PoLandscapePdfGenerator({ globalData, stage3Data, targetSupplier, buttonLabel, size = "small" }) {
  const [downloading, setDownloading] = useState(false);
  const [activeVendorIndex, setActiveVendorIndex] = useState(0);
  const pdfRef = useRef(null);

  // Extract common data fields
  const prNumber = globalData?.prNumber || globalData?.stage1?.prNumber || "-";
  const poNumber = globalData?.poNumber || globalData?.stage3?.poNumber || globalData?.stage2?.poNumber || "-";
  const prDate = fmtDate(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.routingChecklist?.[0]?.date);
  const poDate = fmtDate(globalData?.stage3?.poDate || globalData?.stage2?.poDate || globalData?.stage3?.signOff?.dateOfApproval);
  const prRaisedBy = globalData?.stage1?.preparedBy || globalData?.stage1?.requesterName || globalData?.stage2?.purchaseOfficerName || "-";

  // Company / Buyer details (Only display saved data; do not hardcode fake addresses)
  const companyName = globalData?.companyName || globalData?.buyerName || globalData?.stage1?.companyName || "S R CONTAINER CARRIERS";
  const companyAddress = globalData?.companyAddress || globalData?.buyerAddress || globalData?.stage1?.companyAddress || "-";
  const companyGstin = globalData?.companyGstin || globalData?.gstin || "-";
  const companyContact = globalData?.companyContact || globalData?.contactNumber || globalData?.stage1?.contactNumber || "-";

  // Items / Tyre Details
  const rawItems = globalData?.stage1?.itemsRequired || globalData?.stage1?.items || [];

  // Stage 2 Selected Suppliers
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const stage2Selected = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = [];
  if (targetSupplier) {
    const sName = typeof targetSupplier === "string" ? targetSupplier : (targetSupplier.selectedSupplier || targetSupplier.supplierName);
    const full = stage2Suppliers.find(
      (s) => s.supplierName === sName || s._id === sName || s.supplierNameInBank === sName
    ) || {};
    awardedSuppliers = [{
      supplierName: sName || "Supplier",
      totalOrderValue: Number(targetSupplier.totalOrderValue) || 0,
      priceQuoted: Number(targetSupplier.priceQuoted) || 0,
      reasonForSelection: targetSupplier.reasonForSelection || "",
      ...full,
    }];
  } else if (stage2Selected && stage2Selected.length > 0) {
    awardedSuppliers = stage2Selected.map((sel) => {
      const sName = sel.selectedSupplier || sel.supplierName;
      const full = stage2Suppliers.find(
        (s) => s.supplierName === sName || s._id === sName || s.supplierNameInBank === sName
      ) || {};
      return {
        supplierName: sName || full.supplierName || full.supplierNameInBank || "Supplier",
        totalOrderValue: Number(sel.totalOrderValue) || 0,
        priceQuoted: Number(sel.priceQuoted) || 0,
        reasonForSelection: sel.reasonForSelection || "",
        ...full,
      };
    });
  } else {
    awardedSuppliers = stage2Suppliers.length > 0 ? stage2Suppliers : [
      {
        supplierName: "-",
        gstNumber: "-",
        phoneNumber: "-",
        emailWhatsApp: "-",
        bankName: "-",
        bankAccountNo: "-",
        bankIfscCode: "-",
        paymentTerms: "-",
      },
    ];
  }

  // Current active vendor being rendered
  const currentVendor = awardedSuppliers[activeVendorIndex] || awardedSuppliers[0] || {};
  const vendorName = currentVendor.supplierName || currentVendor.supplierNameInBank || "-";
  const vendorAddress = currentVendor.deliveryLocation || currentVendor.address || currentVendor.supplierAddress || "-";
  const vendorGst = currentVendor.gstNumber || currentVendor.gstin || "-";
  const vendorContact = [currentVendor.phoneNumber, currentVendor.emailWhatsApp].filter(Boolean).join(" | ") || "-";
  const vendorBank = currentVendor.bankName || "-";
  const vendorAccNo = currentVendor.bankAccountNo || currentVendor.accountNumber || "-";
  const vendorIfsc = currentVendor.bankIfscCode || currentVendor.ifscCode || "-";
  const vendorPaymentTerms = currentVendor.paymentTerms || "-";

  // Calculate items quantity & rates
  let totalQtyFromItems = 0;
  rawItems.forEach((it) => {
    totalQtyFromItems += Number(it.qty || it.quantityRequested || it.quantity || 0);
  });
  const quantity = totalQtyFromItems > 0 ? totalQtyFromItems : 1;
  const totalAmount = currentVendor.totalOrderValue || (currentVendor.priceQuoted ? currentVendor.priceQuoted * quantity : 0);
  const unitRate = currentVendor.priceQuoted || (quantity ? Math.round(totalAmount / quantity) : 0);

  // Delivery Details
  const deliveryLocation = globalData?.stage1?.deliveryLocationSite || globalData?.deliveryLocation || "-";
  const deliveryContact = globalData?.stage1?.deliveryContactPerson
    ? `${globalData.stage1.deliveryContactPerson} ${globalData.stage1.contactNumber ? `| ${globalData.stage1.contactNumber}` : ""}`
    : (globalData?.stage1?.contactNumber || "-");
  const expectedDeliveryDate = fmtDate(globalData?.stage1?.neededByDate || globalData?.stage1?.requiredByDate);

  // Signatures / Approvals
  const preparedBy = prRaisedBy;
  const transportHeadApproved = globalData?.stage1?.hodValidation?.validatedBy
    ? `${globalData.stage1.hodValidation.validatedBy} (${globalData.stage1.hodValidation.approvalMode || "Approved"})`
    : "-";
  const transportHeadDate = fmtDate(globalData?.stage1?.hodValidation?.dateTimeOfApproval);

  const financeManagerApproved = globalData?.stage3?.signOff?.financeManagerName || stage3Data?.signOff?.financeManagerName || "-";
  const financeManagerDate = fmtDate(globalData?.stage3?.signOff?.dateOfApproval || stage3Data?.signOff?.dateOfApproval);

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    try {
      const element = pdfRef.current;
      element.style.display = "block";

      const poClean = poNumber !== "-" ? poNumber.replace(/[\/\\]/g, "_") : "PO";

      if (targetSupplier) {
        // Generate single supplier PO PDF (Portrait)
        setActiveVendorIndex(0);
        await new Promise((resolve) => setTimeout(resolve, 200));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("portrait", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 20, 20, imgWidth, Math.min(imgHeight, pdfHeight - 40));
        const suppNameClean = (awardedSuppliers[0].supplierName || "Supplier").replace(/[^a-zA-Z0-9_-]/g, "_");
        pdf.save(`Purchase_Order_${suppNameClean}_${poClean}.pdf`);
      } else {
        // Generate Combined PO PDF for ALL Awarded Suppliers in one PDF file
        const pdf = new jsPDF("portrait", "pt", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < awardedSuppliers.length; i++) {
          setActiveVendorIndex(i);
          await new Promise((resolve) => setTimeout(resolve, 200));

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pdfWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, "PNG", 20, 20, imgWidth, Math.min(imgHeight, pdfHeight - 40));
        }

        pdf.save(`Combined_Purchase_Orders_${poClean}.pdf`);
      }

      element.style.display = "none";
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
      setActiveVendorIndex(0);
    }
  };

  const labelText =
    buttonLabel ||
    (downloading
      ? "Generating PO PDF..."
      : `DOWNLOAD COMBINED PO PDF (${awardedSuppliers.length})`);

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
        onClick={handleGeneratePdf}
        disabled={downloading}
        size={size}
        sx={{
          fontWeight: "bold",
          backgroundColor: "#2e7d32",
          "&:hover": { backgroundColor: "#1b5e20" },
        }}
      >
        {labelText}
      </Button>

      {/* Hidden DOM element rendered specifically for html2canvas Portrait PDF export */}
      <div
        ref={pdfRef}
        style={{
          display: "none",
          width: "760px",
          backgroundColor: "#ffffff",
          color: "#111111",
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          padding: "15px",
          boxSizing: "border-box",
          border: "1.5px solid #222222",
        }}
      >
        {/* Header Title */}
        <div
          style={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "16px",
            borderBottom: "2px solid #222222",
            paddingBottom: "6px",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Purchase Order (PO)
        </div>

        {/* 2-Column Section: Buyer & Vendor */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
          <tbody>
            <tr>
              {/* Left: Buyer Details */}
              <td style={{ width: "50%", verticalAlign: "top", paddingRight: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          border: "1px solid #333333",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#e8ecef",
                        }}
                      >
                        Buyer Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%" }}>
                        Company Name
                      </td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>
                        {companyName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Billing Address</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10.5px" }}>
                        {companyAddress}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>GSTIN</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{companyGstin}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Contact</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{companyContact}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Order Details */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          border: "1px solid #333333",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#e8ecef",
                        }}
                      >
                        Order Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%" }}>PO Number</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>{poNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>PO Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{poDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Delivery Location</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10.5px", whiteSpace: "pre-line" }}>
                        {deliveryLocation}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Delivery Contact</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{deliveryContact}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Expected Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{expectedDeliveryDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right: Vendor Details & PR Reference */}
              <td style={{ width: "50%", verticalAlign: "top", paddingLeft: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          border: "1px solid #333333",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#e8ecef",
                        }}
                      >
                        Vendor Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%" }}>Vendor Name</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>{vendorName}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Address</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10.5px" }}>{vendorAddress}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>GSTIN</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{vendorGst}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Contact</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{vendorContact}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Bank Details</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{vendorBank}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>A/c No</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{vendorAccNo}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>IFSC</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{vendorIfsc}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Payment Terms</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>{vendorPaymentTerms}</td>
                    </tr>
                  </tbody>
                </table>

                {/* PR Reference */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%" }}>
                        PR Number & Date
                      </td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>
                        {prNumber} // {prDate}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>PR Raised By</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{prRaisedBy}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Item Details Table */}
        <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "4px", marginTop: "6px" }}>
          Item Details
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", textAlign: "center" }}>
          <thead>
            <tr style={{ backgroundColor: "#e8ecef" }}>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "6%" }}>Sr.No</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "24%" }}>Brand / Description</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "18%" }}>Size / Spec</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "16%" }}>Type / Category</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "10%" }}>Qty</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "13%" }}>Rate (₹)</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "13%" }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {rawItems.length > 0 ? (
              rawItems.map((item, idx) => {
                const itemQty = Number(item.qty || item.quantityRequested || item.quantity || 1);
                const itemRate = Number(item.estUnitCost || item.ratePerTyre || unitRate);
                const itemTotal = itemQty * itemRate;
                return (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #333333", padding: "5px" }}>{idx + 1}</td>
                    <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold" }}>
                      {item.brandPreference || item.tyreBrand || currentVendor.tyreBrand || "Tyre Item"}
                    </td>
                    <td style={{ border: "1px solid #333333", padding: "5px" }}>
                      {item.sizeSpec || item.sizeSpecification || currentVendor.sizeSpecification || "-"}
                    </td>
                    <td style={{ border: "1px solid #333333", padding: "5px" }}>
                      {item.tyreType || item.type || "-"}
                    </td>
                    <td style={{ border: "1px solid #333333", padding: "5px" }}>{itemQty}</td>
                    <td style={{ border: "1px solid #333333", padding: "5px" }}>
                      {itemRate ? itemRate.toLocaleString("en-IN") : "-"}
                    </td>
                    <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold" }}>
                      {itemTotal ? itemTotal.toLocaleString("en-IN") : totalAmount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td style={{ border: "1px solid #333333", padding: "5px" }}>1</td>
                <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold" }}>
                  {currentVendor.tyreBrand || "Tyre Item"}
                </td>
                <td style={{ border: "1px solid #333333", padding: "5px" }}>
                  {currentVendor.sizeSpecification || "-"}
                </td>
                <td style={{ border: "1px solid #333333", padding: "5px" }}>-</td>
                <td style={{ border: "1px solid #333333", padding: "5px" }}>{quantity}</td>
                <td style={{ border: "1px solid #333333", padding: "5px" }}>
                  {unitRate ? unitRate.toLocaleString("en-IN") : "-"}
                </td>
                <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold" }}>
                  {totalAmount ? totalAmount.toLocaleString("en-IN") : "-"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Approvals & Totals Summary */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px" }}>
          <tbody>
            <tr>
              {/* Left Column: Signatures & Approvals */}
              <td style={{ width: "65%", verticalAlign: "top", paddingRight: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="4"
                        style={{
                          textAlign: "left",
                          border: "1px solid #333333",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#e8ecef",
                        }}
                      >
                        Approval Section
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "30%" }}>Prepared By</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "40%" }}>{preparedBy}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "12%" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "18%" }}>{prDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Transport Head</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{transportHeadApproved}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{transportHeadDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Finance Manager</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{financeManagerApproved}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px" }}>{financeManagerDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right Column: Grand Total Summary */}
              <td style={{ width: "35%", verticalAlign: "top" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", fontWeight: "bold" }}>Sub Total</td>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", textAlign: "right", fontWeight: "bold" }}>
                        ₹ {totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", fontWeight: "bold" }}>Delivery Charges</td>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", textAlign: "right" }}>₹ 0</td>
                    </tr>
                    <tr style={{ backgroundColor: "#e8ecef" }}>
                      <td style={{ border: "1px solid #333333", padding: "6px 8px", fontWeight: "bold", fontSize: "12px" }}>Grand Total</td>
                      <td style={{ border: "1px solid #333333", padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>
                        ₹ {totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export default React.memo(PoLandscapePdfGenerator);
