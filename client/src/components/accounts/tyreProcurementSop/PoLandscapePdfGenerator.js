import React, { useRef, useState } from "react";
import { Button, CircularProgress, IconButton, Tooltip } from "@mui/material";
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
      month: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    return String(d);
  }
};

function PoLandscapePdfGenerator({
  globalData,
  stage3Data,
  targetSupplier,
  buttonLabel,
  size = "small",
  iconOnly = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const [activeVendorIndex, setActiveVendorIndex] = useState(0);
  const pdfRef = useRef(null);

  // Extract common data fields
  const prNumber = globalData?.prNumber || globalData?.stage1?.prNumber || "-";
  const poNumber = globalData?.poNumber || globalData?.stage3?.poNumber || globalData?.stage2?.poNumber || "-";
  const prDate = fmtDate(globalData?.createdAt || globalData?.stage1?.prDate || globalData?.stage1?.routingChecklist?.[0]?.date);
  const poDate = fmtDate(globalData?.stage3?.poDate || globalData?.stage2?.poDate || globalData?.stage3?.signOff?.dateOfApproval || new Date());
  const prRaisedBy = globalData?.stage1?.preparedBy || globalData?.stage1?.requesterName || globalData?.stage2?.purchaseOfficerName || "Operations Team";

  // Company / Buyer details (Default: S R CONTAINER CARRIERS)
  const companyName = globalData?.companyName || globalData?.buyerName || globalData?.stage1?.companyName || "S R CONTAINER CARRIERS";
  const companyAddress =
    globalData?.companyAddress ||
    globalData?.buyerAddress ||
    globalData?.stage1?.companyAddress ||
    "A/206, Wall Street II, Opp. Orient Club, Ellisbridge";
  const companyCityZip = "Ahmedabad, Gujarat 380006";
  const companyGstin =
    globalData?.companyGstin ||
    globalData?.gstin ||
    globalData?.stage1?.companyGstin ||
    "24ANGPR7652E1ZV";
  const companyContact =
    globalData?.companyContact ||
    globalData?.contactNumber ||
    globalData?.stage1?.contactNumber ||
    "+91 9924301166";
  const companyEmail = "ops@srcontainercarriers.com";
  const companyWebsite = "www.srcontainercarriers.com";

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

  // Active vendor for current page rendering
  const currentVendor = awardedSuppliers[activeVendorIndex] || awardedSuppliers[0] || {};
  const vendorName = currentVendor.supplierName || currentVendor.supplierNameInBank || "Vendor";

  const rawVendorAddress =
    currentVendor.supplierAddress ||
    currentVendor.address ||
    "";
  const vendorAddress = rawVendorAddress || "Ahmedabad, Gujarat";

  const vendorGst = currentVendor.gstNumber || currentVendor.gstin || "-";
  const vendorContactPerson = currentVendor.contactPerson || "Sales / Dispatch Dept";
  const vendorPhone = currentVendor.phoneNumber || "";
  const vendorEmail = currentVendor.emailWhatsApp || "";
  const vendorContactDetails = [vendorPhone, vendorEmail].filter(Boolean).join(" | ");
  const vendorBank = currentVendor.bankName || "-";
  const vendorAccNo = currentVendor.bankAccountNo || currentVendor.accountNumber || "-";
  const vendorIfsc = currentVendor.bankIfscCode || currentVendor.ifscCode || "-";
  const vendorPaymentTerms = currentVendor.paymentTerms || "30 DAYS CREDIT";

  // Delivery / Ship To details
  const deliveryLocation =
    currentVendor.deliveryLocation ||
    globalData?.stage2?.deliveryLocation ||
    globalData?.stage1?.deliveryLocation ||
    globalData?.stage1?.departmentLocation ||
    globalData?.stage1?.deliveryLocationSite ||
    companyAddress;

  const deliveryContact =
    currentVendor.deliveryContact ||
    (globalData?.stage2?.deliveryContact && String(globalData?.stage2?.deliveryContact).includes("|")
      ? globalData.stage2.deliveryContact
      : (globalData?.stage1?.deliveryContact && String(globalData?.stage1?.deliveryContact).includes("|"))
        ? globalData.stage1.deliveryContact
        : [
          globalData?.stage2?.deliveryContactPerson || globalData?.stage1?.deliveryContactPerson || globalData?.stage1?.preparedBy,
          globalData?.stage2?.deliveryContactNumber || globalData?.stage1?.deliveryContactNumber || globalData?.stage1?.contactNumber,
        ].filter(Boolean).join(" | ")) || companyContact;

  // Calculate items quantity, rates, and totals
  let totalQtyFromItems = 0;
  rawItems.forEach((it) => {
    totalQtyFromItems += Number(it.qty || it.quantityRequested || it.quantity || 0);
  });
  const prTotalQuantity = totalQtyFromItems > 0 ? totalQtyFromItems : 1;

  const vendorTotalOrderValue = Number(currentVendor.totalOrderValue) || 0;
  const vendorUnitPrice = Number(currentVendor.unitPriceNew || currentVendor.priceQuoted || 0);

  const explicitVendorQty = Number(
    currentVendor.allocatedQty ||
    currentVendor.orderQty ||
    currentVendor.qty ||
    currentVendor.quantity ||
    currentVendor.qtyAvailable ||
    0
  );

  let vendorAllocatedTotalQty = explicitVendorQty;
  if (!vendorAllocatedTotalQty && vendorTotalOrderValue > 0 && vendorUnitPrice > 0) {
    const calcQty = vendorTotalOrderValue / vendorUnitPrice;
    if (calcQty > 0 && Math.abs(calcQty - Math.round(calcQty)) < 0.01) {
      vendorAllocatedTotalQty = Math.round(calcQty);
    } else if (calcQty > 0) {
      vendorAllocatedTotalQty = calcQty;
    }
  }

  if (!vendorAllocatedTotalQty) {
    vendorAllocatedTotalQty = prTotalQuantity;
  }

  let calculatedSubTotal = 0;
  let calculatedTotalGst = 0;

  const itemsList = rawItems.length > 0 ? rawItems : [{}];
  const computedItems = itemsList.map((item, idx) => {
    let itemQty = 0;
    if (rawItems.length <= 1) {
      itemQty = vendorAllocatedTotalQty;
    } else {
      const rawItemQty = Number(item.qty || item.quantityRequested || item.quantity || 1);
      const ratio = prTotalQuantity > 0 ? rawItemQty / prTotalQuantity : 1 / rawItems.length;
      itemQty = Math.round(vendorAllocatedTotalQty * ratio) || rawItemQty;
    }

    const itemRate = Number(
      vendorUnitPrice ||
      item.estUnitCost ||
      item.ratePerTyre ||
      (vendorAllocatedTotalQty ? Math.round(vendorTotalOrderValue / vendorAllocatedTotalQty) : 0)
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

    const productName = item.productName || item.tyreType || currentVendor.selectedProduct || "Tyre Product";
    const brand = item.brandPreference || item.tyreBrand || currentVendor.tyreBrand || "";
    const spec = item.sizeSpec || item.sizeSpecification || item.specification || currentVendor.sizeSpecification || "";
    const fullDescription = [productName, brand, spec].filter(Boolean).join(" - ");

    return {
      itemCode: item.itemNumber || item.itemNo || `[${idx + 101}]`,
      description: fullDescription || "Product Specification as per PR",
      itemQty,
      itemRate,
      itemTotal,
    };
  });

  const grandTotal = vendorTotalOrderValue > 0 ? vendorTotalOrderValue : (calculatedSubTotal + calculatedTotalGst);
  const subTotalToDisplay = calculatedSubTotal > 0 ? calculatedSubTotal : (grandTotal - calculatedTotalGst);

  // Number of filler rows to give the classic PO template body height
  const fillerRowCount = Math.max(0, 7 - computedItems.length);

  const handleGeneratePdf = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);
    try {
      const element = pdfRef.current;
      element.style.display = "block";

      const poClean = poNumber !== "-" ? poNumber.replace(/[\/\\]/g, "_") : "PO";

      if (targetSupplier) {
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

        const imgWidth = pdfWidth - 30;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30));
        const suppNameClean = (awardedSuppliers[0].supplierName || "Supplier").replace(/[^a-zA-Z0-9_-]/g, "_");
        pdf.save(`Purchase_Order_${suppNameClean}_${poClean}.pdf`);
      } else {
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
          const imgWidth = pdfWidth - 30;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, "PNG", 15, 15, imgWidth, Math.min(imgHeight, pdfHeight - 30));
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
      ? "Generating PO..."
      : `DOWNLOAD PO PDF (${awardedSuppliers.length})`);

  return (
    <>
      {iconOnly ? (
        <Tooltip title={`Download Purchase Order PDF (${awardedSuppliers.length} PO${awardedSuppliers.length > 1 ? "s" : ""})`}>
          <span>
            <IconButton
              size="small"
              onClick={handleGeneratePdf}
              disabled={downloading}
              sx={{
                color: "#0284c7",
                bgcolor: "#f0f9ff",
                "&:hover": { bgcolor: "#e0f2fe" },
              }}
            >
              {downloading ? <CircularProgress size={16} sx={{ color: "#0284c7" }} /> : <PictureAsPdfIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <Button
          variant="contained"
          startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={handleGeneratePdf}
          disabled={downloading}
          size={size}
          sx={{
            fontWeight: "bold",
            backgroundColor: "#0284c7",
            "&:hover": { backgroundColor: "#0369a1" },
          }}
        >
          {labelText}
        </Button>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Hidden DOM element rendered strictly to match Image 2 format */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        ref={pdfRef}
        style={{
          display: "none",
          width: "760px",
          minWidth: "760px",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
          fontSize: "11px",
          padding: "24px 28px",
          boxSizing: "border-box",
          border: "2.5px solid #0077b6",
        }}
      >
        {/* Header: Company Details (Left) & PURCHASE ORDER Title (Right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          {/* Left: Company Details */}
          <div style={{ width: "55%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "#0077b6",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: "900",
                  fontSize: "18px",
                }}
              >
                SR
              </div>
              <div>
                <div style={{ color: "#0077b6", fontSize: "20px", fontWeight: "900", letterSpacing: "0.5px", lineHeight: "1.1" }}>
                  {companyName}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "600" }}>
                  Fleet Logistics & Container Transport
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10.5px", color: "#334155", lineHeight: "1.45" }}>
              <div>{companyAddress}</div>
              <div>{companyCityZip}</div>
              <div>Phone: {companyContact}</div>
              <div>GSTIN: {companyGstin}</div>
              <div>Email: {companyEmail} | Web: {companyWebsite}</div>
            </div>
          </div>

          {/* Right: PURCHASE ORDER Heading & DATE / PO # */}
          <div style={{ width: "45%", textAlign: "right" }}>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "900",
                color: "#0077b6",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "10px",
                lineHeight: "1",
              }}
            >
              PURCHASE ORDER
            </div>

            <table style={{ marginLeft: "auto", borderCollapse: "collapse", fontSize: "11px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "3px 12px", color: "#334155", fontWeight: "700", textTransform: "uppercase" }}>DATE</td>
                  <td style={{ padding: "3px 12px", border: "1px solid #cbd5e1", fontWeight: "600", minWidth: "120px", textAlign: "center" }}>
                    {poDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 12px", color: "#334155", fontWeight: "700", textTransform: "uppercase" }}>PO #</td>
                  <td style={{ padding: "3px 12px", border: "1px solid #cbd5e1", fontWeight: "800", color: "#0077b6", minWidth: "120px", textAlign: "center" }}>
                    {currentVendor.poNumber || poNumber || "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2-Column: VENDOR & SHIP TO Boxes */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "14px" }}>
          {/* VENDOR Box */}
          <div style={{ width: "49%", border: "1.5px solid #0077b6", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                backgroundColor: "#0077b6",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "11.5px",
                padding: "4px 10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              VENDOR
            </div>
            <div style={{ padding: "8px 10px", fontSize: "10.5px", lineHeight: "1.45", minHeight: "95px" }}>
              <div style={{ fontWeight: "800", fontSize: "12px", color: "#0f172a", marginBottom: "2px" }}>
                {vendorName}
              </div>
              <div style={{ color: "#475569" }}>{vendorContactPerson}</div>
              <div>{vendorAddress}</div>
              <div>Phone: {vendorPhone || vendorContactDetails || "-"}</div>
              <div>GSTIN: {vendorGst}</div>
              {vendorBank !== "-" && (
                <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                  Bank: {vendorBank} | A/c: {vendorAccNo} | IFSC: {vendorIfsc}
                </div>
              )}
            </div>
          </div>

          {/* SHIP TO Box */}
          <div style={{ width: "49%", border: "1.5px solid #0077b6", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                backgroundColor: "#0077b6",
                color: "#ffffff",
                fontWeight: "800",
                fontSize: "11.5px",
                padding: "4px 10px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              SHIP TO
            </div>
            <div style={{ padding: "8px 10px", fontSize: "10.5px", lineHeight: "1.45", minHeight: "95px" }}>
              <div style={{ fontWeight: "700", color: "#0f172a" }}>
                {deliveryContact.split("|")[0] || prRaisedBy || "Site Manager"}
              </div>
              <div style={{ fontWeight: "800", fontSize: "12px", color: "#0077b6", marginBottom: "2px" }}>
                {companyName}
              </div>
              <div>{deliveryLocation}</div>
              <div>{companyCityZip}</div>
            </div>
          </div>
        </div>

        {/* 4-Column Bar: REQUISITIONER | SHIP VIA | F.O.B. | SHIPPING TERMS */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1.5px solid #0077b6",
            marginBottom: "14px",
            textAlign: "center",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#0077b6", color: "#ffffff", fontSize: "11px", fontWeight: "800" }}>
              <th style={{ padding: "5px 6px", borderRight: "1px solid #ffffff", width: "25%" }}>REQUISITIONER</th>
              <th style={{ padding: "5px 6px", borderRight: "1px solid #ffffff", width: "25%" }}>SHIP VIA</th>
              <th style={{ padding: "5px 6px", borderRight: "1px solid #ffffff", width: "25%" }}>F.O.B.</th>
              <th style={{ padding: "5px 6px", width: "25%" }}>SHIPPING TERMS</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ fontSize: "11px", fontWeight: "600", color: "#0f172a" }}>
              <td style={{ padding: "6px", borderRight: "1px solid #0077b6" }}>{prRaisedBy}</td>
              <td style={{ padding: "6px", borderRight: "1px solid #0077b6" }}>BY ROAD / TRUCK</td>
              <td style={{ padding: "6px", borderRight: "1px solid #0077b6" }}>DESTINATION SITE</td>
              <td style={{ padding: "6px" }}>{vendorPaymentTerms}</td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1.5px solid #0077b6",
            marginBottom: "14px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#0077b6", color: "#ffffff", fontSize: "11px", fontWeight: "800" }}>
              <th style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", width: "14%", textAlign: "center" }}>ITEM #</th>
              <th style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", width: "48%", textAlign: "left" }}>DESCRIPTION</th>
              <th style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", width: "10%", textAlign: "center" }}>QTY</th>
              <th style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", width: "14%", textAlign: "right" }}>UNIT PRICE</th>
              <th style={{ padding: "6px 8px", width: "14%", textAlign: "right" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {computedItems.map((cItem, idx) => (
              <tr key={idx} style={{ fontSize: "11px", minHeight: "24px" }}>
                <td style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", textAlign: "center", color: "#334155" }}>
                  {cItem.itemCode}
                </td>
                <td style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", fontWeight: "600" }}>
                  {cItem.description}
                </td>
                <td style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", textAlign: "center", fontWeight: "700" }}>
                  {cItem.itemQty}
                </td>
                <td style={{ padding: "6px 8px", borderRight: "1px solid #0077b6", textAlign: "right" }}>
                  {Number(cItem.itemRate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "700" }}>
                  {Number(cItem.itemTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}

            {/* Empty filler rows with vertical grid lines matching Image 2 */}
            {Array.from({ length: fillerRowCount }).map((_, fIdx) => (
              <tr key={`fill-${fIdx}`} style={{ height: "22px" }}>
                <td style={{ borderRight: "1px solid #0077b6" }}></td>
                <td style={{ borderRight: "1px solid #0077b6" }}></td>
                <td style={{ borderRight: "1px solid #0077b6" }}></td>
                <td style={{ borderRight: "1px solid #0077b6" }}></td>
                <td style={{ textAlign: "right", paddingRight: "12px", color: "#94a3b8" }}>-</td>
              </tr>
            ))}

            {/* Summary Lines */}
            <tr>
              <td colSpan="3" style={{ borderTop: "1.5px solid #0077b6", borderRight: "1px solid #0077b6" }}></td>
              <td style={{ borderTop: "1.5px solid #0077b6", borderRight: "1px solid #0077b6", padding: "5px 8px", fontWeight: "700", textAlign: "right", backgroundColor: "#f8fafc" }}>
                SUBTOTAL
              </td>
              <td style={{ borderTop: "1.5px solid #0077b6", padding: "5px 8px", textAlign: "right", fontWeight: "700" }}>
                {Number(subTotalToDisplay).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
            <tr>
              <td colSpan="3" style={{ borderRight: "1px solid #0077b6" }}></td>
              <td style={{ borderRight: "1px solid #0077b6", padding: "4px 8px", fontWeight: "700", textAlign: "right", backgroundColor: "#f8fafc" }}>
                TAX
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: calculatedTotalGst > 0 ? "#0f172a" : "#94a3b8" }}>
                {calculatedTotalGst > 0
                  ? Number(calculatedTotalGst).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : "-"}
              </td>
            </tr>
            <tr>
              <td colSpan="3" style={{ borderRight: "1px solid #0077b6" }}></td>
              <td style={{ borderRight: "1px solid #0077b6", padding: "4px 8px", fontWeight: "700", textAlign: "right", backgroundColor: "#f8fafc" }}>
                SHIPPING
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: "#94a3b8" }}>-</td>
            </tr>
            <tr>
              <td colSpan="3" style={{ borderRight: "1px solid #0077b6" }}></td>
              <td style={{ borderRight: "1px solid #0077b6", padding: "4px 8px", fontWeight: "700", textAlign: "right", backgroundColor: "#f8fafc" }}>
                OTHER
              </td>
              <td style={{ padding: "4px 8px", textAlign: "right", color: "#94a3b8" }}>-</td>
            </tr>
            <tr>
              <td colSpan="3" style={{ borderRight: "1px solid #0077b6" }}></td>
              <td
                style={{
                  borderRight: "1px solid #0077b6",
                  padding: "6px 8px",
                  fontWeight: "900",
                  fontSize: "12px",
                  textAlign: "right",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                }}
              >
                TOTAL
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "right",
                  fontWeight: "900",
                  fontSize: "12.5px",
                  backgroundColor: "#f59e0b",
                  color: "#000000",
                }}
              >
                ₹ {Number(grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Comments or Special Instructions Box */}
        <div style={{ width: "58%", border: "1.5px solid #0077b6", borderRadius: "2px", overflow: "hidden", marginBottom: "18px" }}>
          <div
            style={{
              backgroundColor: "#0077b6",
              color: "#ffffff",
              fontWeight: "800",
              fontSize: "11px",
              padding: "4px 8px",
              textTransform: "uppercase",
            }}
          >
            Comments or Special Instructions
          </div>
          <div style={{ padding: "8px 10px", fontSize: "10.5px", lineHeight: "1.45", color: "#334155" }}>
            <div>1. Requisition reference: <strong>PR #{prNumber}</strong> (Dated: {prDate})</div>
            <div>2. Payment Terms: <strong>{vendorPaymentTerms}</strong> from invoice delivery date</div>
            <div>3. Delivery Acceptance: Subject to physical inspection and verification at site</div>
            {vendorBank !== "-" && (
              <div>4. Remittance Account: {vendorBank} | A/c No: {vendorAccNo} | IFSC: {vendorIfsc}</div>
            )}
          </div>
        </div>

        {/* Contact Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "10.5px",
            color: "#475569",
            paddingTop: "8px",
            borderTop: "1px dashed #cbd5e1",
          }}
        >
          If you have any questions about this purchase order, please contact <strong>{prRaisedBy}</strong> ({companyContact}, {companyEmail})
        </div>
      </div>
    </>
  );
}

export default React.memo(PoLandscapePdfGenerator);
