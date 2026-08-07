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
      year: "2-digit",
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
  const prNumber = globalData?.prNumber || globalData?.stage1?.prNumber || "TT-TYRE-2026-0042";
  const poNumber = globalData?.poNumber || globalData?.stage3?.poNumber || globalData?.stage2?.poNumber || "PO/TYR/2627/021";
  const prDate = fmtDate(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.routingChecklist?.[0]?.date || new Date());
  const poDate = fmtDate(globalData?.stage3?.poDate || globalData?.stage2?.poDate || globalData?.stage3?.signOff?.dateOfApproval || new Date());
  const prRaisedBy = globalData?.stage1?.requesterName || globalData?.stage2?.purchaseOfficerName || "Mr. Jishnu";

  // Stage 1 Item / Tyre Details
  const items = globalData?.stage1?.items || [];
  const primaryItem = items[0] || {};
  const quantity = primaryItem.quantityRequested || 3;

  // Stage 2 Selected Suppliers
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const stage2Selected = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = [];
  if (targetSupplier) {
    const sName = typeof targetSupplier === 'string' ? targetSupplier : (targetSupplier.selectedSupplier || targetSupplier.supplierName);
    const full = stage2Suppliers.find(
      (s) => s.supplierName === sName || s._id === sName || s.supplierNameInBank === sName
    ) || {};
    awardedSuppliers = [{
      supplierName: sName || "Supplier",
      totalOrderValue: Number(targetSupplier.totalOrderValue) || 0,
      priceQuoted: Number(targetSupplier.priceQuoted) || 0,
      reasonForSelection: targetSupplier.reasonForSelection || "",
      ...full
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
        supplierName: "SHREE RAM TYRES",
        supplierNameInBank: "SHREE RAM TYRES",
        gstNumber: "24DGMPS8775K1ZD",
        phoneNumber: "8291199218",
        emailWhatsApp: "shreeramtyres2016@gmail.com",
        bankName: "IDFC FIRST BANK, NARODA BRANCH",
        bankAccountNo: "10042041535",
        bankIfscCode: "IDFB0040314",
        paymentTerms: "100% advance, Rates are Inclusive of Tax",
      },
    ];
  }

  // Current active vendor being rendered
  const currentVendor = awardedSuppliers[activeVendorIndex] || awardedSuppliers[0] || {};
  const vendorName = currentVendor.supplierName || currentVendor.supplierNameInBank || "Supplier";
  const vendorAddress = currentVendor.deliveryLocation || currentVendor.address || "321/4, PATEL VAS, NAVSANSKAR SCHOOL BUILDING, JUNA WADAJ, Ahmedabad, Gujarat, 380013";
  const vendorGst = currentVendor.gstNumber || currentVendor.gstin || "24DGMPS8775K1ZD";
  const vendorContact = `${currentVendor.phoneNumber || "8291199218"} | ${currentVendor.emailWhatsApp || "shreeramtyres2016@gmail.com"}`;
  const vendorBank = currentVendor.bankName || "IDFC FIRST BANK, NARODA BRANCH";
  const vendorAccNo = currentVendor.bankAccountNo || "10042041535";
  const vendorIfsc = currentVendor.bankIfscCode || "IDFB0040314";
  const vendorPaymentTerms = currentVendor.paymentTerms || "100% advance, Rates are Inclusive of Tax";

  const totalAmount = currentVendor.totalOrderValue || (currentVendor.priceQuoted ? currentVendor.priceQuoted * quantity : 57300);
  const unitRate = currentVendor.priceQuoted || currentVendor.unitPriceNew || (quantity ? Math.round(totalAmount / quantity) : 19100);

  // Delivery Details
  const deliveryLocation = globalData?.stage1?.deliveryLocationSite || "SRCC MAINTENANCE CENTER\nC/o. SR CONTAINER CARRIERS\nNEW SANJHA CHULLA GARDEN RESTAURANT-2\nNEXT TO ADANI SAHNTIGRAM, NR. KHODIAR PETROL PUMP, KHORAJ, ICD Khodiyar, GANDHINAGAR, Gujarat-382501";
  const deliveryContact = globalData?.stage1?.deliveryContactPerson ? `${globalData.stage1.deliveryContactPerson} // Mr. Jishnu | 6238291722` : "Sunil Kumar | 9924304633 // Mr. Jishnu | 6238291722";
  const expectedDeliveryDate = fmtDate(globalData?.stage1?.requiredByDate || new Date());

  // Signatures
  const preparedBy = prRaisedBy;
  const transportHeadApproved = globalData?.stage1?.hodValidation?.approvedByName
    ? `${globalData.stage1.hodValidation.approvedByName} (Approved on WhatsApp)`
    : "Mohit Singh (Approved on WhatsApp to Jishnu)";
  const transportHeadDate = fmtDate(globalData?.stage1?.hodValidation?.dateTimeOfApproval || new Date());

  const financeManagerApproved = globalData?.stage3?.signOff?.financeManagerName || stage3Data?.signOff?.financeManagerName || "Chirag Shah";
  const financeManagerDate = fmtDate(globalData?.stage3?.signOff?.dateOfApproval || stage3Data?.signOff?.dateOfApproval || new Date());

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    try {
      const element = pdfRef.current;
      element.style.display = "block";

      for (let i = 0; i < awardedSuppliers.length; i++) {
        setActiveVendorIndex(i);
        // Allow DOM to update
        await new Promise((resolve) => setTimeout(resolve, 250));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("landscape", "pt", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 20, 20, imgWidth, Math.min(imgHeight, pdfHeight - 40));
        
        const suppNameClean = (awardedSuppliers[i].supplierName || `Supplier_${i+1}`).replace(/[^a-zA-Z0-9_-]/g, "_");
        const poClean = poNumber.replace(/[\/\\]/g, "_");
        pdf.save(`Purchase_Order_${suppNameClean}_${poClean}.pdf`);
      }

      element.style.display = "none";
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
      setActiveVendorIndex(0);
    }
  };

  const labelText = buttonLabel || (downloading ? "Generating PO PDF(s)..." : `Download PO PDF${awardedSuppliers.length > 1 ? "s" : ""} (Landscape)`);

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

      {/* Hidden DOM element rendered specifically for html2canvas PDF export */}
      <div
        ref={pdfRef}
        style={{
          display: "none",
          width: "1100px",
          backgroundColor: "#ffffff",
          color: "#000000",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          padding: "10px",
          boxSizing: "border-box",
          border: "2px solid #000000",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "14px",
            borderBottom: "1.5px solid #000000",
            paddingBottom: "4px",
            marginBottom: "8px",
          }}
        >
          Purchase Order (PO)
        </div>

        {/* Top Details Section: 2 Columns */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
          <tbody>
            <tr>
              {/* Left Column: Buyer & Order Details */}
              <td style={{ width: "50%", verticalAlign: "top", paddingRight: "6px" }}>
                {/* Buyer Details */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          border: "1px solid #000000",
                          padding: "3px 6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        Buyer Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "30%" }}>
                        Company Name
                      </td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>
                        S R CONTAINER CARRIERS
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Billing Address</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontSize: "11px" }}>
                        A/206, WALL STREET II, OPP. ORIENT CLUB, ELLISBRIDGE, Ahmedabad, Gujarat, 380006
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>GSTIN</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>24ANGPR7652E1ZV</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Contact</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>9924301166 | ajay@surajforwarders.com</td>
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
                          border: "1px solid #000000",
                          padding: "3px 6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        Order Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "35%" }}>PO Number</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{poNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>PO Date</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{poDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Delivery Location</td>
                      <td
                        style={{
                          border: "1px solid #000000",
                          padding: "3px 6px",
                          backgroundColor: "#ffff00",
                          fontWeight: "bold",
                          whiteSpace: "pre-line",
                          fontSize: "10.5px",
                        }}
                      >
                        {deliveryLocation}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>
                        Delivery Location Contact Person/Number
                      </td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", backgroundColor: "#ffff00", fontWeight: "bold" }}>
                        {deliveryContact}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Expected Delivery Date</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{expectedDeliveryDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right Column: Vendor Details & PR Reference */}
              <td style={{ width: "50%", verticalAlign: "top", paddingLeft: "6px" }}>
                {/* Vendor Details */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="2"
                        style={{
                          textAlign: "left",
                          border: "1px solid #000000",
                          padding: "3px 6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        Vendor Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "30%" }}>Vendor Name</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>{vendorName}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Address</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontSize: "11px" }}>{vendorAddress}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>GSTIN</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{vendorGst}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Contact</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{vendorContact}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Bank Details</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{vendorBank}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>A/c No</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{vendorAccNo}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>IFSC</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{vendorIfsc}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Payment Terms</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", backgroundColor: "#ffff00", fontWeight: "bold" }}>
                        <div>{vendorPaymentTerms}</div>
                        <div style={{ fontSize: "10px", marginTop: "2px" }}>Delivery Charges Extra Payable Directly to Auto Driver</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* PR Reference */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "35%" }}>
                        PR Number & Date
                      </td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>
                        {prNumber} // {prDate}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>PR Raised by</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{prRaisedBy}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tyre Details Table */}
        <div style={{ fontWeight: "bold", marginBottom: "3px" }}>Tyre Details</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", textAlign: "center" }}>
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "6%" }}>Sr.No</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "24%" }}>Brand</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "14%" }}>Size</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "12%" }}>Model</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "14%" }}>Category</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "12%" }}>Rate/Tyre</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "6%" }}>Qty</th>
              <th style={{ border: "1px solid #000000", padding: "4px", width: "12%" }}>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid #000000", padding: "4px", fontWeight: "bold" }}>
                    {item.tyreBrand || currentVendor.tyreBrand || "MRF TTF"}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>
                    {item.sizeSpecification || currentVendor.sizeSpecification || "1000*20"}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>
                    {item.tyreModel || "SM 99"}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>
                    {item.tyreType || "Nylon"}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>
                    {unitRate.toLocaleString("en-IN")}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px" }}>
                    {item.quantityRequested || currentVendor.qtyAvailable || quantity}
                  </td>
                  <td style={{ border: "1px solid #000000", padding: "4px", fontWeight: "bold" }}>
                    {totalAmount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>1</td>
                <td style={{ border: "1px solid #000000", padding: "4px", fontWeight: "bold" }}>
                  {currentVendor.tyreBrand || "MRF TTF"}
                </td>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>
                  {currentVendor.sizeSpecification || "1000*20"}
                </td>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>SM 99</td>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>Nylon</td>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>{unitRate.toLocaleString("en-IN")}</td>
                <td style={{ border: "1px solid #000000", padding: "4px" }}>{quantity}</td>
                <td style={{ border: "1px solid #000000", padding: "4px", fontWeight: "bold" }}>{totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Bottom Section: Approvals & Totals */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {/* Left Column: Approval Section */}
              <td style={{ width: "70%", verticalAlign: "top", paddingRight: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th
                        colSpan="4"
                        style={{
                          textAlign: "left",
                          border: "1px solid #000000",
                          padding: "3px 6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        Approval Section
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "25%" }}>Prepared By</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", width: "45%" }}>{preparedBy}</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "10%" }}>Date</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold", width: "20%" }}>{prDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Approved By (Transport Head)</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{transportHeadApproved}</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Date</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>{transportHeadDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Approved By (Accounts Manager)</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px" }}>{financeManagerApproved}</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>Date</td>
                      <td style={{ border: "1px solid #000000", padding: "3px 6px", fontWeight: "bold" }}>{financeManagerDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right Column: Totals Summary */}
              <td style={{ width: "30%", verticalAlign: "top" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", fontWeight: "bold" }}>Sub Total</td>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", textAlign: "right", fontWeight: "bold" }}>
                        ₹ {totalAmount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", fontWeight: "bold" }}>Delivery Charges</td>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", textAlign: "right", backgroundColor: "#ffff00", fontWeight: "bold" }}>
                        ₹ 0
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", fontWeight: "bold", fontSize: "13px" }}>Grand Total</td>
                      <td style={{ border: "1px solid #000000", padding: "4px 6px", textAlign: "right", fontWeight: "bold", fontSize: "13px" }}>
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
