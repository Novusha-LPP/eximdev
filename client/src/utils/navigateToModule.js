export const navigateToModule = (module, navigate) => {
  switch (module) {
    case "Employee Onboarding":
      return navigate("/employee-onboarding");
    case "Employee KYC":
      return navigate("/employee-kyc");
    case "Update Employee Data":
      return navigate("/update-employee-data");
    case "Import - DSR":
      return navigate("/import-dsr");
    case "Report":
      return navigate("/report");
    case "Audit Trail":
      return navigate("/audit-trail");
    case "Import - Operations":
      return navigate("/import-operations");
    case "Import - Add":
      return navigate("/ImportersInfo");
    case "Import - Billing":
      return navigate("/import-billing");
    case "Import Utility Tool":
      return navigate("/utilities");
    case "Import - DO":
      return navigate("/import-do");
    case "Inward Register":
      return navigate("/inward-register");
    case "Export":
      return window.open("https://export.alvision.in", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Directories":
      return window.open("https://export.alvision.in/export-directories", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Audit Trail":
      return window.open("https://export.alvision.in/export-audit-trail", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Charges":
      return window.open("https://export.alvision.in/export-charges", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Documentation":
      return window.open("https://export.alvision.in/export-documentation", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - E-Sanchit":
      return window.open("https://export.alvision.in/export-esanchit", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Jobs":
      return window.open("https://export.alvision.in/export-dsr", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Export - Operation":
      return window.open("https://export.alvision.in/export-operation", "_blank", "width=1400,height=900,scrollbars=yes,resizable=yes");
    case "Outward Register":
      return navigate("/outward-register");
    case "Accounts":
      return navigate("/accounts");
    case "Customer KYC":
      return navigate("/customer-kyc");
    case "Exit Feedback":
      return navigate("/exit-feedback");
    case "e-Sanchit":
      return navigate("/e-sanchit");
    case "Directories":
      return navigate("/export-directories");
    case "Documentation":
      return navigate("/documentation");
    case "Submission":
      return navigate("/submission");
    case "DGFT":
      return navigate("/dgft");
    case "CRM":
      return navigate("/crm");
    case "Open Points":
      return navigate("/open-points");
    case "KPI":
      return navigate("/kpi");
    case "MRM":
      return navigate("/mrm");
    case "Pulse":
      return navigate("/pulse");
    case "MasterDirectory":
      return navigate("/master-directory");
    default:
      return navigate("/home");
  }
};