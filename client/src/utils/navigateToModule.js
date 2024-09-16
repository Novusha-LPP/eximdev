export const navigateToModule = (module, navigate) => {
  switch (module) {
    case "Employee Onboarding":
      return navigate("/employee-onboarding");
    case "Employee KYC":
      return navigate("/employee-kyc");
    case "Import - DSR":
      return navigate("/import-dsr");
    case "Import - Operations":
      return navigate("/import-operations");
    case "Import - DO":
      return navigate("/import-do");
    case "Inward Register":
      return navigate("/inward-register");
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
    case "LR Report":
      return navigate("/lr-report");
    case "Tyre Maintenance":
      return navigate("/tyre-maintenance");
    case "SRCC Directories":
      return navigate("/srcc-directories");
    case "RTO":
      return navigate("/rto");
    case "SR CEL":
      return navigate("/srcel");
    case "Documentation":
      return navigate("/documentation");
    case "Submission":
      return navigate("/submission");
    default:
      return navigate("/home");
  }
};
