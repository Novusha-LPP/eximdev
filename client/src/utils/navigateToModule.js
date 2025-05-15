export const navigateToModule = (module, navigate) => {
  switch (module) {
    case "Employee Onboarding":
      return navigate("/employee-onboarding");
    case "Employee KYC":
      return navigate("/employee-kyc");
    case "Import - DSR":
      return navigate("/import-dsr");
    case "Customer":
      return navigate("/customer");
    case "Import - Operations":
      return navigate("/import-operations");
    case "Import - Add":
      return navigate("/ImportersInfo");
    case "Import Utility Tool":
      return navigate("/utilities");
    case "Import - DO":
      return navigate("/import-do");
    case "Inward Register":
      return navigate("/inward-register");
    case "Outward Register":
      return navigate("/outward-register");
    case "Accounts":
      return navigate("/accounts");
    case "Import - Billing":
      return navigate("/import-billing");
    case "Customer KYC":
      return navigate("/customer-kyc");
    case "Exit Feedback":
      return navigate("/exit-feedback");
    case "e-Sanchit":
      return navigate("/e-sanchit");
    case "LR Operations":
      return navigate("/lr-report");
    case "Tyre Maintenance":
      return navigate("/tyre-maintenance");
    case "Directories":
      return navigate("/srcc-directories");
    case "RTO":
      return navigate("/rto");
    case "SR CEL":
      return navigate("/srcel");
    case "Documentation":
      return navigate("/documentation");
    case "Submission":
      return navigate("/submission");
    case "Screen1":
      return navigate("/screen1");
    case "Screen2":
      return navigate("/screen2");
    case "Screen3":
      return navigate("/screen3");
    case "Screen4":
      return navigate("/screen4");
    case "Screen5":
      return navigate("/screen5");
    case "Screen6":
      return navigate("/screen6");
    default:
      return navigate("/home");
  }
};
