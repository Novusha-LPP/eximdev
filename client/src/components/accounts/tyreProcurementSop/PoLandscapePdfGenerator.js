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

  // Company / Buyer details (Defaults to S R CONTAINER CARRIERS official details if not specifically overridden)
  const companyName = globalData?.companyName || globalData?.buyerName || globalData?.stage1?.companyName || "S R CONTAINER CARRIERS";
  const companyAddress =
    globalData?.companyAddress ||
    globalData?.buyerAddress ||
    globalData?.stage1?.companyAddress ||
    "A/206, WALL STREET II, OPP. ORIENT CLUB, ELLISBRIDGE, Ahmedabad, Gujarat, 380006";
  const companyGstin =
    globalData?.companyGstin ||
    globalData?.gstin ||
    globalData?.stage1?.companyGstin ||
    "24ANGPR7652E1ZV";
  const companyContact =
    globalData?.companyContact ||
    globalData?.contactNumber ||
    globalData?.stage1?.contactNumber ||
    "9924301166";

  // Items / Tyre Details
  const rawItems = globalData?.stage1?.itemsRequired || globalData?.stage1?.items || [];

  // Stage 2 Selected Suppliers
  const stage2Suppliers = globalData?.stage2?.suppliers || [];
  const stage2Selected = globalData?.stage2?.selectedSuppliers || [];

  let awardedSuppliers = [];
  if (targetSupplier) {
    const sName = typeof targetSupplier === "string" ? targetSupplier : (targetSupplier.selectedSupplier || targetSupplier.supplierName);
    const full = stage2Suppliers.find(
      (s) =>
        s.supplierName === sName ||
        s._id === sName ||
        s.supplierNameInBank === sName ||
        (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.trim().toUpperCase())
    ) || {};
    awardedSuppliers = [{
      supplierName: sName || full.supplierName || "Supplier",
      totalOrderValue: Number(targetSupplier.totalOrderValue) || full.totalOrderValue || 0,
      priceQuoted: Number(targetSupplier.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
      reasonForSelection: targetSupplier.reasonForSelection || full.reasonForSelection || "",
      poNumber: targetSupplier.poNumber || globalData?.poNumber || "-",
      ...full,
      ...(typeof targetSupplier === "object" ? targetSupplier : {}),
    }];
  } else if (stage2Selected && stage2Selected.length > 0) {
    awardedSuppliers = stage2Selected.map((sel) => {
      const sName = sel.selectedSupplier || sel.supplierName;
      const full = stage2Suppliers.find(
        (s) =>
          s.supplierName === sName ||
          s._id === sName ||
          s.supplierNameInBank === sName ||
          (sName && s.supplierName && s.supplierName.trim().toUpperCase() === sName.trim().toUpperCase())
      ) || {};
      return {
        supplierName: sName || full.supplierName || full.supplierNameInBank || "Supplier",
        totalOrderValue: Number(sel.totalOrderValue) || full.totalOrderValue || 0,
        priceQuoted: Number(sel.priceQuoted) || full.unitPriceNew || full.priceQuoted || 0,
        reasonForSelection: sel.reasonForSelection || "",
        poNumber: sel.poNumber || globalData?.poNumber || "-",
        ...full,
        ...sel,
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

  // Prioritize supplierAddress / address.
  // If blank because the user previously put the supplier address into delivery address, use delivery address!
  const rawVendorAddress =
    currentVendor.supplierAddress ||
    currentVendor.address ||
    currentVendor.deliveryLocation ||
    globalData?.stage2?.deliveryLocation ||
    "";
  const vendorAddress = rawVendorAddress || "-";

  const vendorGst = currentVendor.gstNumber || currentVendor.gstin || "-";
  const vendorContactPerson = currentVendor.contactPerson || "";
  const vendorPhone = currentVendor.phoneNumber || "";
  const vendorEmail = currentVendor.emailWhatsApp || "";
  const vendorContactDetails = [vendorPhone, vendorEmail].filter(Boolean).join(" | ");
  const vendorContact = [vendorContactPerson, vendorContactDetails].filter(Boolean).join(" - ") || "-";
  const vendorBank = currentVendor.bankName || "-";
  const vendorAccNo = currentVendor.bankAccountNo || currentVendor.accountNumber || "-";
  const vendorIfsc = currentVendor.bankIfscCode || currentVendor.ifscCode || "-";
  const vendorPaymentTerms = currentVendor.paymentTerms || "-";

  // Delivery Details:
  // Taken directly from the quotation (currentVendor), falling back to stage2 / stage1 / company details
  const vendorDeliveryLoc =
    (currentVendor.deliveryLocation && currentVendor.deliveryLocation !== vendorAddress)
      ? currentVendor.deliveryLocation
      : "";

  const isVendorAddrInDelivery =
    Boolean(vendorAddress && vendorAddress !== "-") &&
    (globalData?.stage2?.deliveryLocation === vendorAddress ||
     currentVendor.deliveryLocation === vendorAddress);

  const deliveryLocation =
    vendorDeliveryLoc ||
    (isVendorAddrInDelivery
      ? (globalData?.stage1?.departmentLocation ||
         globalData?.stage1?.deliveryLocationSite ||
         companyAddress ||
         "-")
      : (globalData?.stage2?.deliveryLocation ||
         globalData?.stage1?.deliveryLocation ||
         globalData?.stage1?.departmentLocation ||
         globalData?.stage1?.deliveryLocationSite ||
         globalData?.deliveryLocation ||
         "-"));

  const deliveryContact =
    currentVendor.deliveryContact ||
    (globalData?.stage2?.deliveryContact && String(globalData?.stage2?.deliveryContact).includes("|")
      ? globalData.stage2.deliveryContact
      : (globalData?.stage1?.deliveryContact && String(globalData?.stage1?.deliveryContact).includes("|"))
        ? globalData.stage1.deliveryContact
        : [
            globalData?.stage2?.deliveryContactPerson || globalData?.stage1?.deliveryContactPerson || globalData?.stage1?.preparedBy,
            globalData?.stage2?.deliveryContactNumber || globalData?.stage1?.deliveryContactNumber || globalData?.stage1?.contactNumber,
          ].filter(Boolean).join(" | ")) || "-";
  const expectedDeliveryDate = fmtDate(globalData?.stage1?.neededByDate || globalData?.stage1?.requiredByDate);

  // Calculate items quantity, rates, and GST breakdown
  let totalQtyFromItems = 0;
  rawItems.forEach((it) => {
    totalQtyFromItems += Number(it.qty || it.quantityRequested || it.quantity || 0);
  });
  const quantity = totalQtyFromItems > 0 ? totalQtyFromItems : 1;
  const vendorTotalOrderValue = Number(currentVendor.totalOrderValue) || 0;
  const vendorUnitPrice = Number(currentVendor.unitPriceNew || currentVendor.priceQuoted || 0);

  let calculatedSubTotal = 0;
  let calculatedTotalGst = 0;

  const itemsList = rawItems.length > 0 ? rawItems : [{}];
  const computedItems = itemsList.map((item) => {
    const itemQty = Number(item.qty || item.quantityRequested || item.quantity || (rawItems.length === 0 ? quantity : 1));
    const itemRate = Number(
      vendorUnitPrice ||
      item.estUnitCost ||
      item.ratePerTyre ||
      (quantity ? Math.round(vendorTotalOrderValue / quantity) : 0)
    );
    const itemBase = itemQty * itemRate;

    let itemGst = 0;
    if (currentVendor.gstAmount !== undefined && currentVendor.gstAmount !== null && currentVendor.gstAmount !== "" && Number(currentVendor.gstAmount) > 0) {
      itemGst = rawItems.length > 1 ? Math.round(Number(currentVendor.gstAmount) / rawItems.length) : Number(currentVendor.gstAmount);
    } else if (currentVendor.gstRate) {
      const rateVal = parseFloat(String(currentVendor.gstRate).replace("%", "")) || 0;
      itemGst = Math.round((itemBase * rateVal) / 100);
    } else if (item.gstAmount) {
      itemGst = Number(item.gstAmount) || 0;
    } else if (vendorTotalOrderValue > 0 && rawItems.length <= 1) {
      const diff = vendorTotalOrderValue - itemBase;
      if (diff > 0) itemGst = diff;
    }

    const itemTotal = (vendorTotalOrderValue > 0 && rawItems.length <= 1)
      ? vendorTotalOrderValue
      : (itemBase + itemGst);

    calculatedSubTotal += itemBase;
    calculatedTotalGst += itemGst;

    return {
      raw: item,
      itemQty,
      itemRate,
      itemBase,
      itemGst,
      itemTotal,
    };
  });

  const grandTotal = vendorTotalOrderValue > 0 ? vendorTotalOrderValue : (calculatedSubTotal + calculatedTotalGst);
  const subTotalToDisplay = calculatedSubTotal > 0 ? calculatedSubTotal : (grandTotal - calculatedTotalGst);

  // Signatures / Approvals
  const preparedBy = prRaisedBy;
  const thName = globalData?.stage1?.hodValidation?.validatedBy || "MOHIT SINGH";
  const thMode = globalData?.stage1?.hodValidation?.approvalMode
    ? ` (${globalData.stage1.hodValidation.approvalMode})`
    : "";
  const transportHeadApproved = `${thName}${thMode}`;
  const transportHeadDate =
    fmtDate(globalData?.stage1?.hodValidation?.dateTimeOfApproval) ||
    fmtDate(globalData?.stage1?.prDate || globalData?.prDate);

  const financeManagerApproved =
    globalData?.stage3?.signOff?.financeManagerName ||
    stage3Data?.signOff?.financeManagerName ||
    "CHIRAG SHAH";
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
          width: "740px",
          minWidth: "740px",
          backgroundColor: "#ffffff",
          color: "#111111",
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          padding: "16px",
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
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "10px",
            boxSizing: "border-box",
          }}
        >
          <tbody>
            <tr>
              {/* Left: Buyer Details */}
              <td style={{ width: "50%", verticalAlign: "top", paddingRight: "6px", boxSizing: "border-box" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "8px",
                  }}
                >
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
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                        Company Name
                      </td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                        {companyName}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Billing Address</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", lineHeight: "1.3" }}>
                        {companyAddress}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>GSTIN</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{companyGstin}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Contact</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{companyContact}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Order Details */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
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
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>PO Number</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                        {currentVendor.poNumber || poNumber}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>PO Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{poDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Delivery Location</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", lineHeight: "1.3" }}>
                        {deliveryLocation}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Delivery Contact</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{deliveryContact}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Expected Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{expectedDeliveryDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right: Vendor Details & PR Reference */}
              <td style={{ width: "50%", verticalAlign: "top", paddingLeft: "6px", boxSizing: "border-box" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginBottom: "8px",
                  }}
                >
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
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Vendor Name</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorName}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Address</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontSize: "10px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal", lineHeight: "1.3" }}>{vendorAddress}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>GSTIN</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorGst}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Contact Person</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorContactPerson || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Phone / Email</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorContactDetails || "-"}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Bank Details</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorBank}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>A/c No</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorAccNo}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>IFSC</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorIfsc}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Payment Terms</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{vendorPaymentTerms}</td>
                    </tr>
                  </tbody>
                </table>

                {/* PR Reference */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                        PR Number & Date
                      </td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                        {prNumber} // {prDate}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "35%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>PR Raised By</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "65%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{prRaisedBy}</td>
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
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "12px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#e8ecef" }}>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "5%" }}>Sr.No</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "22%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Product / Item</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "13%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Brand</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "16%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Specification</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "7%" }}>Qty</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "12%" }}>Unit Price (₹)</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "12%" }}>GST Amount (₹)</th>
              <th style={{ border: "1px solid #333333", padding: "5px", width: "13%" }}>Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((cItem, idx) => {
              const item = cItem.raw || {};
              return (
                <tr key={idx}>
                  <td style={{ border: "1px solid #333333", padding: "5px" }}>{idx + 1}</td>
                  <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                    {item.productName || item.tyreType || currentVendor.selectedProduct || "Item"}
                  </td>
                  <td style={{ border: "1px solid #333333", padding: "5px", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                    {item.brandPreference || item.tyreBrand || currentVendor.tyreBrand || "-"}
                  </td>
                  <td style={{ border: "1px solid #333333", padding: "5px", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                    {item.sizeSpec || item.sizeSpecification || item.specification || currentVendor.sizeSpecification || "-"}
                  </td>
                  <td style={{ border: "1px solid #333333", padding: "5px" }}>{cItem.itemQty}</td>
                  <td style={{ border: "1px solid #333333", padding: "5px", textAlign: "right" }}>
                    {cItem.itemRate ? `₹ ${cItem.itemRate.toLocaleString("en-IN")}` : "-"}
                  </td>
                  <td style={{ border: "1px solid #333333", padding: "5px", textAlign: "right" }}>
                    {cItem.itemGst ? `₹ ${cItem.itemGst.toLocaleString("en-IN")}` : "₹ 0"}
                  </td>
                  <td style={{ border: "1px solid #333333", padding: "5px", fontWeight: "bold", textAlign: "right" }}>
                    ₹ {cItem.itemTotal.toLocaleString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Approvals & Totals Summary */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "6px",
            boxSizing: "border-box",
          }}
        >
          <tbody>
            <tr>
              {/* Left Column: Signatures & Approvals */}
              <td style={{ width: "65%", verticalAlign: "top", paddingRight: "6px", boxSizing: "border-box" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
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
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "28%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Prepared By</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "42%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{preparedBy}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "12%" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "18%" }}>{prDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "28%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Transport Head</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "42%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{transportHeadApproved}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "12%" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "18%" }}>{transportHeadDate}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "28%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>Finance Manager</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "42%", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>{financeManagerApproved}</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", fontWeight: "bold", width: "12%" }}>Date</td>
                      <td style={{ border: "1px solid #333333", padding: "4px 8px", width: "18%" }}>{financeManagerDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right Column: Grand Total Summary */}
              <td style={{ width: "35%", verticalAlign: "top", boxSizing: "border-box" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", fontWeight: "bold", width: "50%" }}>Sub Total</td>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", textAlign: "right", fontWeight: "bold", width: "50%" }}>
                        ₹ {subTotalToDisplay.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", fontWeight: "bold", width: "50%" }}>GST Amount</td>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", textAlign: "right", width: "50%" }}>
                        ₹ {calculatedTotalGst.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", fontWeight: "bold", width: "50%" }}>Delivery Charges</td>
                      <td style={{ border: "1px solid #333333", padding: "5px 8px", textAlign: "right", width: "50%" }}>₹ 0</td>
                    </tr>
                    <tr style={{ backgroundColor: "#e8ecef" }}>
                      <td style={{ border: "1px solid #333333", padding: "6px 8px", fontWeight: "bold", fontSize: "12px", width: "50%" }}>Grand Total</td>
                      <td style={{ border: "1px solid #333333", padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "12px", width: "50%" }}>
                        ₹ {grandTotal.toLocaleString("en-IN")}
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
