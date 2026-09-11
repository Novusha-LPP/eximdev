import express from "express";
import ExcelJS from "exceljs";
import Asset from "../../model/it-helpdesk/assetModel.mjs";
import Contract from "../../model/it-helpdesk/contractModel.mjs";
import Ticket from "../../model/it-helpdesk/ticketModel.mjs";
import Vendor from "../../model/it-helpdesk/vendorModel.mjs";
import License from "../../model/it-helpdesk/licenseModel.mjs";
import Inventory from "../../model/it-helpdesk/inventoryModel.mjs";
import AuditTrailModel from "../../model/auditTrailModel.mjs";
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

    // Export ALL data directly from DB without applying UI query filters
    const filter = {};

    const workbook = new ExcelJS.Workbook();
    let filename = `IT_${reportType}_report.xlsx`;
    let worksheet;

    if (reportType === "assets") {
      filename = `IT_Asset_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Asset Report");

      const assets = await Asset.find(filter)
        .populate("assigned_to", "username first_name last_name email name")
        .populate("vendor", "name")
        .sort({ createdAt: -1 })
        .lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Asset Tag", key: "asset_tag", width: 16 },
        { header: "Asset Type", key: "asset_type", width: 16 },
        { header: "Asset Name", key: "asset_name", width: 24 },
        { header: "Manufacturer", key: "manufacturer", width: 18 },
        { header: "Model", key: "model", width: 20 },
        { header: "Serial Number", key: "serial_number", width: 20 },
        { header: "Status", key: "status", width: 14 },
        { header: "Assigned To", key: "assigned_to", width: 22 },
        { header: "Department", key: "department", width: 18 },
        { header: "Location", key: "location", width: 22 },
        { header: "Purchase Date", key: "purchase_date", width: 16 },
        { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
        { header: "Purchase Cost", key: "purchase_cost", width: 14 },
        { header: "Vendor", key: "vendor", width: 20 },
        { header: "Processor", key: "processor", width: 18 },
        { header: "RAM", key: "ram", width: 14 },
        { header: "Storage", key: "storage", width: 14 },
        { header: "Operating System", key: "operating_system", width: 18 },
        { header: "Device Category", key: "device_category", width: 18 },
        { header: "IP Address", key: "ip_address", width: 16 },
        { header: "MAC Address", key: "mac_address", width: 18 },
        { header: "Software Category", key: "software_category", width: 18 },
        { header: "Version", key: "version", width: 14 },
        { header: "License Type", key: "license_type", width: 16 },
        { header: "License Key / Subscription ID", key: "license_key_subscription_id", width: 24 },
        { header: "Number of Licenses", key: "number_of_licenses", width: 16 },
        { header: "Expiry/Renewal Date", key: "expiry_renewal_date", width: 18 },
        { header: "IMEI Number", key: "imei_number", width: 18 },
        { header: "Rack Name", key: "rack_name", width: 18 },
        { header: "Rack Type", key: "rack_type", width: 16 },
        { header: "Rack Size (U Height)", key: "rack_size_u_height", width: 18 },
        { header: "Installation Date", key: "installation_date", width: 16 },
        { header: "Cable Name", key: "cable_name", width: 18 },
        { header: "Cable Type", key: "cable_type", width: 16 },
        { header: "Length", key: "length", width: 14 },
        { header: "Printer Type", key: "printer_type", width: 16 },
        { header: "Connection Type", key: "connection_type", width: 16 },
        { header: "SIM Number (ICCID)", key: "sim_number_iccid", width: 20 },
        { header: "Mobile Number", key: "mobile_number", width: 16 },
        { header: "IMSI Number", key: "imsi_number", width: 18 },
        { header: "Service Provider", key: "service_provider", width: 16 },
        { header: "Plan Type", key: "plan_type", width: 14 },
        { header: "Monthly Plan/Package", key: "monthly_plan_package", width: 20 },
        { header: "Remarks", key: "remarks", width: 24 },
        { header: "Description", key: "description", width: 24 },
      ];

      assets.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          asset_tag: item.asset_tag || "—",
          asset_type: item.asset_type || item.category || "—",
          asset_name: item.asset_name || item.name || "—",
          manufacturer: item.manufacturer || "—",
          model: item.model || "—",
          serial_number: item.serial_number || "—",
          status: item.status || "—",
          assigned_to: formatUser(item.assigned_to),
          department: item.department || "—",
          location: (typeof item.location === "object" ? item.location?.name : item.location) || "—",
          purchase_date: formatDate(item.purchase_date),
          warranty_expiry: formatDate(item.warranty_expiry),
          purchase_cost: item.purchase_cost || "—",
          vendor: item.vendor?.name || item.vendor_name || "—",
          processor: item.processor || "—",
          ram: item.ram || "—",
          storage: item.storage || "—",
          operating_system: item.operating_system || "—",
          device_category: item.device_category || "—",
          ip_address: item.ip_address || "—",
          mac_address: item.mac_address || "—",
          software_category: item.software_category || "—",
          version: item.version || "—",
          license_type: item.license_type || "—",
          license_key_subscription_id: item.license_key_subscription_id || "—",
          number_of_licenses: item.number_of_licenses || "—",
          expiry_renewal_date: formatDate(item.expiry_renewal_date),
          imei_number: item.imei_number || "—",
          rack_name: item.rack_name || "—",
          rack_type: item.rack_type || "—",
          rack_size_u_height: item.rack_size_u_height || "—",
          installation_date: formatDate(item.installation_date),
          cable_name: item.cable_name || "—",
          cable_type: item.cable_type || "—",
          length: item.length || "—",
          printer_type: item.printer_type || "—",
          connection_type: item.connection_type || "—",
          sim_number_iccid: item.sim_number_iccid || "—",
          mobile_number: item.mobile_number || "—",
          imsi_number: item.imsi_number || "—",
          service_provider: item.service_provider || "—",
          plan_type: item.plan_type || "—",
          monthly_plan_package: item.monthly_plan_package || "—",
          remarks: item.remarks || "—",
          description: item.description || "—",
        });
      });
    } else if (reportType === "tickets") {
      filename = `IT_Ticket_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Ticket Report");

      const tickets = await Ticket.find(filter)
        .populate("raised_by", "username email first_name last_name name")
        .populate("assigned_to", "username email first_name last_name name")
        .sort({ createdAt: -1 })
        .lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Ticket ID", key: "ticket_id", width: 16 },
        { header: "Title", key: "title", width: 28 },
        { header: "Description", key: "description", width: 36 },
        { header: "Category", key: "category", width: 16 },
        { header: "Priority", key: "priority", width: 14 },
        { header: "Status", key: "status", width: 14 },
        { header: "Assigned To", key: "assigned_to", width: 22 },
        { header: "Raised By / Requester", key: "raised_by", width: 22 },
        { header: "Department", key: "department", width: 18 },
        { header: "Location", key: "location", width: 20 },
        { header: "Created Date", key: "createdAt", width: 18 },
      ];

      tickets.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          ticket_id: item.ticket_id || "—",
          title: item.title || "—",
          description: item.description || "—",
          category: item.category || "—",
          priority: item.priority || "—",
          status: item.status || "—",
          assigned_to: formatUser(item.assigned_to),
          raised_by: formatUser(item.raised_by) || item.requester_name || "—",
          department: item.department || "—",
          location: item.location || "—",
          createdAt: formatDate(item.createdAt),
        });
      });
    } else if (reportType === "vendors") {
      filename = `IT_Vendor_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Vendor Report");

      const vendors = await Vendor.find(filter).sort({ createdAt: -1 }).lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Vendor Code", key: "vendor_code", width: 16 },
        { header: "Company Name", key: "name", width: 28 },
        { header: "Vendor Type", key: "vendor_type", width: 18 },
        { header: "Contact Person", key: "contact_person", width: 22 },
        { header: "Email Address", key: "email", width: 26 },
        { header: "Mobile Number", key: "mobile", width: 16 },
        { header: "GSTIN", key: "gstin", width: 20 },
        { header: "PAN Number", key: "pan", width: 16 },
        { header: "Status", key: "status", width: 12 },
        { header: "Created Date", key: "createdAt", width: 16 },
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
          createdAt: formatDate(item.createdAt),
        });
      });
    } else if (reportType === "licenses") {
      filename = `IT_License_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("License Report");

      const licenses = await License.find(filter)
        .populate("vendor", "name")
        .sort({ expiry_date: 1 })
        .lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "License Name", key: "license_name", width: 24 },
        { header: "License Code", key: "license_code", width: 18 },
        { header: "Software Product", key: "software_name", width: 26 },
        { header: "License Type", key: "license_type", width: 16 },
        { header: "Vendor", key: "vendor", width: 22 },
        { header: "Allocated Seats", key: "seats", width: 18 },
        { header: "Cost (₹)", key: "cost", width: 14 },
        { header: "Purchase Date", key: "purchase_date", width: 16 },
        { header: "Expiry Date", key: "expiry_date", width: 16 },
        { header: "Status", key: "status", width: 14 },
        { header: "Assigned To", key: "assigned_to", width: 22 },
        { header: "Assigned Asset", key: "assigned_asset", width: 20 },
      ];

      licenses.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          license_name: item.license_name || item.software_name || "—",
          license_code: item.license_code || "—",
          software_name: item.software_name || item.license_name || "—",
          license_type: item.license_type || "Standard",
          vendor: item.vendor?.name || item.vendor_name || "—",
          seats: `${item.allocated_seats || item.used_seats || 0} / ${item.total_seats || "—"}`,
          cost: item.cost || 0,
          purchase_date: formatDate(item.purchase_date),
          expiry_date: formatDate(item.expiry_date),
          status: item.status || "Active",
          assigned_to: item.assigned_to || "—",
          assigned_asset: item.assigned_asset || "—",
        });
      });
    } else if (reportType === "inventory") {
      filename = `IT_Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Inventory Report");

      const items = await Inventory.find(filter).sort({ createdAt: -1 }).lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Item ID / Serial", key: "item_id", width: 18 },
        { header: "Brand", key: "brand", width: 18 },
        { header: "Model", key: "model", width: 20 },
        { header: "Category", key: "category", width: 16 },
        { header: "Inventory Type", key: "inventory_type", width: 16 },
        { header: "Warranty Start Date", key: "warranty_start_date", width: 18 },
        { header: "Warranty End Date", key: "warranty_end_date", width: 18 },
        { header: "Created Date", key: "createdAt", width: 16 },
      ];

      items.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          item_id: item.item_id || "—",
          brand: item.brand || "—",
          model: item.model || "—",
          category: item.category || "—",
          inventory_type: item.inventory_type || "Old",
          warranty_start_date: formatDate(item.warranty_start_date),
          warranty_end_date: formatDate(item.warranty_end_date),
          createdAt: formatDate(item.createdAt),
        });
      });
    } else if (reportType === "notifications" || reportType === "alerts") {
      filename = `IT_Expiry_Notifications_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Expiry Notifications");

      const [assets, contracts, licenses] = await Promise.all([
        Asset.find({ warranty_expiry: { $ne: null } }).lean(),
        Contract.find({ end_date: { $ne: null } }).populate("vendor", "name").lean(),
        License.find({ expiry_date: { $ne: null } }).lean(),
      ]);

      const computeAlertStatus = (dateStr) => {
        if (!dateStr) return { status: "Unknown", diffDays: 0 };
        const expiry = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { status: "Expired", diffDays };
        if (diffDays <= 30) return { status: "Expiring Soon", diffDays };
        return { status: "Upcoming", diffDays };
      };

      const warrantyAlerts = assets.map((a) => {
        const comp = computeAlertStatus(a.warranty_expiry);
        return {
          type: "Warranty Expiry",
          item: a.asset_tag || a.asset_name || "Hardware Asset",
          details: `${a.asset_type || "Device"} - ${a.manufacturer || ""} ${a.model || ""}`.trim(),
          date: a.warranty_expiry,
          diffDays: comp.diffDays,
          status: comp.status,
        };
      });

      const contractAlerts = contracts.map((c) => {
        const comp = computeAlertStatus(c.end_date);
        return {
          type: "Contract Renewal",
          item: c.contract_number || c.contract_name || "AMC Contract",
          details: c.vendor_name || c.vendor?.name || "Maintenance Partner",
          date: c.end_date,
          diffDays: comp.diffDays,
          status: comp.status,
        };
      });

      const licenseAlerts = licenses.map((l) => {
        const comp = computeAlertStatus(l.expiry_date);
        return {
          type: "License Expiry",
          item: l.software_name || l.license_name || "Software License",
          details: `Key: ${l.license_code || "N/A"} - Assigned: ${l.assigned_to || "Unassigned"}`,
          date: l.expiry_date,
          diffDays: comp.diffDays,
          status: comp.status,
        };
      });

      const allAlerts = [...warrantyAlerts, ...contractAlerts, ...licenseAlerts].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Alert Type", key: "type", width: 20 },
        { header: "Item / Subject", key: "item", width: 28 },
        { header: "Details", key: "details", width: 36 },
        { header: "Expiry / Renewal Date", key: "date", width: 22 },
        { header: "Days Remaining", key: "days_remaining", width: 20 },
        { header: "Status", key: "status", width: 16 },
      ];

      allAlerts.forEach((item, idx) => {
        worksheet.addRow({
          srNo: idx + 1,
          type: item.type,
          item: item.item,
          details: item.details || "—",
          date: formatDate(item.date),
          days_remaining: item.diffDays < 0 ? `${Math.abs(item.diffDays)} days overdue` : `${item.diffDays} days left`,
          status: item.status,
        });
      });
    } else if (
      reportType === "audit" ||
      reportType === "audit-logs" ||
      reportType === "audit-trail" ||
      reportType === "auditlogs"
    ) {
      filename = `Audit_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      worksheet = workbook.addWorksheet("Audit Logs");

      const documentTypeMap = {
        ITAsset: "Asset",
        ItVendor: "Vendor",
        HelpdeskTicket: "Helpdesk",
        ITInventory: "Inventory",
        ITContract: "Contract",
        ITLicense: "License",
        User: "User",
      };

      const auditLogs = await AuditTrailModel.find({})
        .sort({ timestamp: -1 })
        .limit(50000)
        .lean();

      worksheet.columns = [
        { header: "S.No", key: "srNo", width: 8 },
        { header: "Timestamp", key: "timestamp", width: 22 },
        { header: "User", key: "user", width: 22 },
        { header: "Action", key: "action", width: 16 },
        { header: "Module", key: "module", width: 18 },
        { header: "Details / Activity", key: "details", width: 45 },
        { header: "IP Address", key: "ip_address", width: 18 },
        { header: "User Agent", key: "user_agent", width: 35 },
      ];

      auditLogs.forEach((item, idx) => {
        const rawUser = formatUser(item.username || item.user || item.userId);
        const moduleName = documentTypeMap[item.documentType] || item.documentType || "General";
        const detailsText =
          item.heading ||
          item.details ||
          item.reason ||
          (item.changes && item.changes.length > 0 ? `${item.changes.length} field change(s)` : "—");

        worksheet.addRow({
          srNo: idx + 1,
          timestamp: item.timestamp
            ? new Date(item.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
            : "—",
          user: rawUser,
          action: item.action || "UNKNOWN",
          module: moduleName,
          details: detailsText,
          ip_address: item.ip_address || "—",
          user_agent: item.userAgent || item.user_agent || "—",
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
