import express from "express";
import ExcelJS from "exceljs";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import Ticket from "../../model/it-helpdesk/ticketModel.mjs";
import Vendor from "../../model/it-helpdesk/vendorModel.mjs";
import License from "../../model/it-helpdesk/licenseModel.mjs";
import Inventory from "../../model/it-helpdesk/inventoryModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import logger from "../../logger.js";

const router = express.Router();
router.use(authMiddleware);

function formatUser(userVal) {
  if (!userVal) return "—";
  if (typeof userVal === "object" && userVal !== null) {
    if (userVal.first_name) {
      return `${userVal.first_name} ${userVal.last_name || ""}`.trim();
    }
    return userVal.name || userVal.username || userVal.email || "—";
  }
  const str = String(userVal).trim();
  if (/^[0-9a-fA-F]{24}$/.test(str)) return "—";
  return str;
}

function formatDate(dateVal) {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

// ── Export Handler Engine ───────────────────────────────────────────────────
const handleReportExport = async (req, res) => {
  try {
    const reportType = (req.params.reportType || req.query.report_type || req.query.type || "assets").toLowerCase();
    const { status, category, asset_type, license_type, vendor_type, inventory_type, priority, department, search, fromDate, toDate, quick_filter } = req.query;

    const filter = {};

    // Date Range Filter
    if (fromDate || toDate) {
      const dateField = reportType === "licenses" ? "expiry_date" : "createdAt";
      filter[dateField] = {};
      if (fromDate) filter[dateField].$gte = new Date(fromDate);
      if (toDate) {
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        filter[dateField].$lte = endOfDay;
      }
    }

    const workbook = new ExcelJS.Workbook();
    let filename = `IT_${reportType}_report.xlsx`;
    let worksheet;

    if (reportType === "assets") {
      filename = `IT_Asset_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Asset Report");

      const selectedType = category || asset_type || req.query.type;
      if (selectedType && selectedType !== "ALL") filter.asset_type = selectedType;
      if (status && status !== "ALL") filter.status = status;
      if (department && department !== "ALL") filter.department = department;

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { asset_tag: searchRegex },
          { asset_name: searchRegex },
          { manufacturer: searchRegex },
          { model: searchRegex },
          { serial_number: searchRegex },
          { location: searchRegex },
          { department: searchRegex },
        ];
      }

      if (quick_filter === "EXPIRING_SOON") {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        filter.warranty_expiry = { $gte: now, $lte: thirtyDays };
      } else if (quick_filter === "ACTION_REQUIRED") {
        filter.status = { $in: ["In Repair", "Under Maintenance", "Scrapped", "Retired", "Lost"] };
      }

      const assets = await Asset.find(filter)
        .populate("assigned_to", "username first_name last_name email name")
        .populate("vendor", "name")
        .sort({ createdAt: -1 })
        .lean();

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 8 },
        { header: "Asset Tag", key: "asset_tag", width: 16 },
        { header: "Asset Name / Model", key: "name", width: 28 },
        { header: "Asset Type", key: "asset_type", width: 16 },
        { header: "Status", key: "status", width: 14 },
        { header: "Location", key: "location", width: 22 },
        { header: "Assigned User", key: "assigned_to", width: 22 },
        { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
        { header: "Purchase Date", key: "purchase_date", width: 16 },
        { header: "Serial Number", key: "serial_number", width: 20 },
      ];

      assets.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          asset_tag: item.asset_tag || "—",
          name: item.name || item.asset_name || `${item.manufacturer || ""} ${item.model || ""}`.trim() || "—",
          asset_type: item.asset_type || item.category || "—",
          status: item.status || "—",
          location: (typeof item.location === "object" ? item.location?.name : item.location) || "—",
          assigned_to: formatUser(item.assigned_to),
          warranty_expiry: formatDate(item.warranty_expiry),
          purchase_date: formatDate(item.purchase_date),
          serial_number: item.serial_number || "—",
        });
      });
    } else if (reportType === "tickets") {
      filename = `IT_Ticket_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Ticket Report");

      if (category && category !== "ALL") filter.category = category;
      if (status && status !== "ALL") filter.status = status;
      if (priority && priority !== "ALL") filter.priority = priority;
      if (department && department !== "ALL") filter.department = department;

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { ticket_id: searchRegex },
          { title: searchRegex },
          { description: searchRegex },
          { requester_name: searchRegex },
          { department: searchRegex },
          { category: searchRegex },
        ];
      }

      if (quick_filter === "ACTION_REQUIRED") {
        filter.priority = { $in: ["High", "Critical"] };
      }

      const tickets = await Ticket.find(filter)
        .populate("raised_by", "username email first_name last_name name")
        .populate("assigned_to", "username email first_name last_name name")
        .sort({ createdAt: -1 })
        .lean();

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 8 },
        { header: "Ticket ID", key: "ticket_id", width: 16 },
        { header: "Title", key: "title", width: 32 },
        { header: "Category", key: "category", width: 16 },
        { header: "Status", key: "status", width: 14 },
        { header: "Priority", key: "priority", width: 14 },
        { header: "Department", key: "department", width: 18 },
        { header: "Assigned User", key: "assigned_to", width: 22 },
        { header: "Raised By", key: "raised_by", width: 22 },
        { header: "Created Date", key: "createdAt", width: 16 },
      ];

      tickets.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          ticket_id: item.ticket_id || "—",
          title: item.title || "—",
          category: item.category || "—",
          status: item.status || "—",
          priority: item.priority || "—",
          department: item.department || "—",
          assigned_to: formatUser(item.assigned_to),
          raised_by: formatUser(item.raised_by) || item.requester_name || "—",
          createdAt: formatDate(item.createdAt),
        });
      });
    } else if (reportType === "vendors") {
      filename = `IT_Vendor_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Vendor Report");

      const selectedType = category || vendor_type || req.query.type;
      if (selectedType && selectedType !== "ALL") filter.vendor_type = selectedType;
      if (status && status !== "ALL") filter.status = status;

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { name: searchRegex },
          { vendor_code: searchRegex },
          { contact_person: searchRegex },
          { email: searchRegex },
          { mobile_number: searchRegex },
        ];
      }

      const vendors = await Vendor.find(filter).sort({ createdAt: -1 }).lean();

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 8 },
        { header: "Vendor Code", key: "vendor_code", width: 16 },
        { header: "Company Name", key: "name", width: 28 },
        { header: "Vendor Type", key: "vendor_type", width: 18 },
        { header: "Contact Person", key: "contact_person", width: 22 },
        { header: "Email Address", key: "email", width: 26 },
        { header: "Mobile", key: "mobile", width: 16 },
        { header: "GSTIN", key: "gstin", width: 20 },
        { header: "PAN", key: "pan", width: 16 },
        { header: "Status", key: "status", width: 12 },
      ];

      vendors.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          vendor_code: item.vendor_code || "—",
          name: item.name || item.vendor_name || "—",
          vendor_type: item.vendor_type || item.type || "Supplier",
          contact_person: item.contact_person || "—",
          email: item.email || "—",
          mobile: item.mobile_number || item.phone || "—",
          gstin: item.gst_number || "—",
          pan: item.pan_number || "—",
          status: item.status || "Active",
        });
      });
    } else if (reportType === "licenses") {
      filename = `IT_License_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("License Report");

      const selectedType = category || license_type || req.query.type;
      if (selectedType && selectedType !== "ALL") filter.license_type = selectedType;

      if (status && status !== "ALL") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (status === "Active") {
          filter.$or = [{ expiry_date: null }, { expiry_date: { $gt: thirtyDaysFromNow } }];
        } else if (status === "Expiring Soon") {
          filter.expiry_date = { $gte: today, $lte: thirtyDaysFromNow };
        } else if (status === "Expired") {
          filter.expiry_date = { $lt: today };
        } else if (status === "No Expiry") {
          filter.expiry_date = null;
        } else {
          filter.status = status;
        }
      }

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { license_name: searchRegex },
          { license_code: searchRegex },
          { software_name: searchRegex },
          { assigned_to: searchRegex },
        ];
      }

      const licenses = await License.find(filter)
        .populate("vendor", "name")
        .sort({ expiry_date: 1 })
        .lean();

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 8 },
        { header: "Software Product", key: "software_name", width: 28 },
        { header: "License Key / Code", key: "license_code", width: 22 },
        { header: "License Type", key: "license_type", width: 16 },
        { header: "Vendor", key: "vendor", width: 22 },
        { header: "Allocated Seats", key: "seats", width: 18 },
        { header: "Cost (₹)", key: "cost", width: 14 },
        { header: "Expiry Date", key: "expiry_date", width: 16 },
        { header: "Status", key: "status", width: 14 },
      ];

      licenses.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          software_name: item.software_name || item.license_name || "—",
          license_code: item.license_code || "—",
          license_type: item.license_type || "Standard",
          vendor: item.vendor?.name || item.vendor_name || "—",
          seats: `${item.allocated_seats || item.used_seats || 0} / ${item.total_seats || "—"}`,
          cost: item.cost || 0,
          expiry_date: formatDate(item.expiry_date),
          status: item.status || "Active",
        });
      });
    } else if (reportType === "inventory") {
      filename = `IT_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Inventory Report");

      if (category && category !== "ALL") filter.category = category;
      const selectedType = inventory_type || status || req.query.type;
      if (selectedType && selectedType !== "ALL") {
        filter.inventory_type = { $regex: new RegExp(`^${selectedType.trim()}$`, "i") };
      }

      if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { item_id: searchRegex },
          { brand: searchRegex },
          { model: searchRegex },
          { category: searchRegex },
        ];
      }

      const items = await Inventory.find(filter).sort({ createdAt: -1 }).lean();

      worksheet.columns = [
        { header: "Sr. No.", key: "srNo", width: 8 },
        { header: "Item ID", key: "item_id", width: 16 },
        { header: "Brand & Model", key: "brand_model", width: 28 },
        { header: "Category", key: "category", width: 16 },
        { header: "Quantity Stock", key: "quantity", width: 16 },
        { header: "Inventory Type", key: "inventory_type", width: 16 },
        { header: "Warranty End Date", key: "warranty_end_date", width: 18 },
      ];

      items.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          item_id: item.item_id || "—",
          brand_model: `${item.brand || ""} ${item.model || ""}`.trim() || "—",
          category: item.category || "—",
          quantity: item.quantity || 1,
          inventory_type: item.inventory_type || "Old",
          warranty_end_date: formatDate(item.warranty_end_date),
        });
      });
    } else {
      return res.status(400).json({ success: false, message: `Invalid report type: ${reportType}` });
    }

    // Format Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" }, size: 11 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "0F172A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 26;

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    logger.error(`Error exporting ${req.params.reportType || "report"} to Excel: ${err.message}`);
    return res.status(500).json({ success: false, message: `Failed to generate report: ${err.message}` });
  }
};

router.get("/:reportType/export", handleReportExport);
router.get("/export", handleReportExport);

export default router;
