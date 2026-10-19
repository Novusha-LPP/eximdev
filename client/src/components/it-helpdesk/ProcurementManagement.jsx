import React, { useState, useEffect, useCallback, useContext } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Divider,
  Autocomplete,
  InputAdornment,
} from "@mui/material";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Check,
  ExternalLink,
  Eye,
  Download,
  Layers,
  ShieldCheck,
  ArrowRight,
  Boxes,
  RefreshCw,
  Building2,
  Truck,
  Receipt,
  CreditCard,
  PackageCheck,
  X,
  UploadCloud,
  FileCheck,
  Calendar,
  Clock,
  User,
  UserCheck,
  Tag,
  Laptop,
  Cpu,
  HardDrive,
  Info,
  Sparkles,
  History,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { UserContext } from "../../contexts/UserContext";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import "../../styles/scorecard.scss";

// 12-Stage Visual Definition
const STAGES = [
  { id: 1, title: "Purchase Request", short: "PR", icon: FileText },
  { id: 2, title: "3 Quotations", short: "Quotes", icon: FileSpreadsheet },
  { id: 3, title: "IT Evaluation", short: "IT Eval", icon: ShieldCheck },
  { id: 4, title: "HOD Approval", short: "HOD", icon: CheckCircle2 },
  { id: 5, title: "GM Approval", short: "GM", icon: CheckCircle2 },
  { id: 6, title: "Purchase Order", short: "PO", icon: Receipt },
  { id: 7, title: "Receiving / GRN", short: "GRN", icon: Truck },
  { id: 8, title: "Tax Invoice", short: "Invoice", icon: FileText },
  { id: 9, title: "3-Way Match", short: "Accounts", icon: FileCheck },
  { id: 10, title: "Payment & UTR", short: "Payment", icon: CreditCard },
  { id: 11, title: "Asset Register", short: "Asset", icon: Boxes },
  { id: 12, title: "Handover", short: "Handover", icon: PackageCheck },
];

const CATEGORIES = [
  "Computer / Desktop",
  "Laptop",
  "Server",
  "Network Device",
  "Monitor",
  "Printer",
  "CCTV",
  "UPS",
  "RAM",
  "SSD",
  "Cable",
  "Peripheral",
  "Software License",
  "Other",
];

const BRANCHES = [
  "Head Office",
  "Baroda",
  "Ahmedabad",
  "Khadoyar RABS",
  "SRCC Khodiyar",
  "SRCC Maintenance",
  "SEA",
  "AIR",
];

export default function ProcurementManagement() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useContext(UserContext) || {};
  const currentUsername = String(currentUser?.username || "").toLowerCase().trim();
  const currentRole = String(currentUser?.role || "").toLowerCase().trim();
  const currentDept = String(currentUser?.department || "").toLowerCase().trim();

  // Role Checks - support designated names & organizational roles
  const isSuperAdmin = currentRole === "admin" || currentRole === "administrator" || currentUsername === "admin";
  const isHOD = currentUsername === "shalini_arun" || currentRole === "hod" || currentRole === "head_of_department" || Boolean(currentUser?.isHOD);
  const isGM = (currentUsername === "manu_pillai" || currentRole.includes("general manager") || currentRole === "gm") && !isHOD;
  const isShaliniArun = isHOD || isSuperAdmin;
  const isManuPillai = (isGM || isSuperAdmin) && !isHOD;
  const isAccountsUser = currentDept.includes("account") || isSuperAdmin;
  const isITUser = currentDept.includes("it") || isSuperAdmin || Boolean(currentUser?.is_operator);

  // Data States
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    quotationPending: 0,
    itReview: 0,
    hodPending: 0,
    gmPending: 0,
    poCreated: 0,
    goodsReceived: 0,
    invoiceVerification: 0,
    paymentPending: 0,
    completed: 0,
    rejected: 0,
    returned: 0,
  });

  // Filter States - support reading ?stage=4 or ?stage=5 from query params
  const paramStage = searchParams.get("stage");
  const parsedStage = paramStage && !isNaN(Number(paramStage)) ? Number(paramStage) : "All";
  const parsedStatus = parsedStage === 4 ? "HOD Approval Pending" : parsedStage === 5 ? "GM Approval Pending" : "All";

  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState(parsedStatus);
  const [stageFilter, setStageFilter] = useState(parsedStage);
  const showStage5 = isManuPillai && !isHOD && stageFilter !== 4;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [vendorList, setVendorList] = useState([]);

  // Modal States
  const [newPrModalOpen, setNewPrModalOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);
  const [workflowTab, setWorkflowTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Document Viewer Modal
  const [docViewerUrl, setDocViewerUrl] = useState(null);
  const [docViewerTitle, setDocViewerTitle] = useState("");

  // New PR Form
  const [prForm, setPrForm] = useState({
    pr_number: "",
    item_name: "",
    category: "Computer / Desktop",
    quantity: 1,
    estimated_budget: "",
    budget_head: "IT CapEx",
    priority: "Normal",
    branch: "Head Office",
    justification: "",
    required_by_date: "",
    processor: "",
    ram: "",
    storage: "",
  });

  // Active Workflow Tabs state forms
  const [itEvalForm, setItEvalForm] = useState({
    decision: "Approved",
    recommended_vendor: "",
    recommended_quote_no: "",
    remarks: "",
  });

  const [hodForm, setHodForm] = useState({
    decision: "Approved",
    approved_amount: "",
    remarks: "",
  });

  const [gmForm, setGmForm] = useState({
    decision: "Approved",
    selected_vendor: "",
    selected_quote_no: "",
    final_approved_amount: "",
    remarks: "",
  });

  const [poForm, setPoForm] = useState({
    po_number: "",
    po_date: "",
    po_amount: "",
    po_file_url: "",
    expected_delivery: "",
    notes: "",
  });

  const [grnForm, setGrnForm] = useState({
    grn_number: "",
    received_date: "",
    received_qty: 1,
    serial_numbers_text: "",
    delivery_challan_url: "",
    inspection_status: "Accepted",
    receipt_status: "Received",
    remarks: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    vendor_name: "",
    vendor_id: null,
    invoice_number: "",
    invoice_date: "",
    gstin: "",
    invoice_amount: "",
    invoice_url: "",
    po_verified: true,
    grn_verified: true,
    verification_status: "Verified",
    accounts_remarks: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_status: "Processed",
    payment_mode: "Bank Transfer",
    paid_amount: "",
    payment_date: "",
    utr_number: "",
    payment_proof_url: "",
    closure_remarks: "",
  });

  const [handoverForm, setHandoverForm] = useState({
    assigned_to_name: "",
    department: "",
    location: "",
    handover_date: "",
    remarks: "",
  });

  // Quotations edit form
  const [quotesList, setQuotesList] = useState([]);

  // Fetch Vendor Dropdown from Vendors & AMC Suppliers module
  const fetchVendors = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.vendors.getAll({ all: "true" });
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];
      setVendorList(list);
    } catch (err) {
      console.warn("Could not fetch vendors from Vendors & AMC Suppliers module:", err);
    }
  }, []);

  // Fetch Stats & Requests
  const fetchStats = useCallback(async () => {
    try {
      const res = await itHelpdeskAPI.procurement.getStats();
      if (res?.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn("Could not load stats:", err);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: searchTerm,
        branch: branchFilter,
        category: categoryFilter,
        status: statusFilter,
        stage: stageFilter,
      };
      const res = await itHelpdeskAPI.procurement.getAll(params);
      if (res?.data) {
        setItems(res.data);
        setTotalPages(res.meta?.totalPages || 1);
      }
    } catch (err) {
      toast.error("Failed to load procurement requests");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, branchFilter, categoryFilter, statusFilter, stageFilter]);

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, [fetchVendors, fetchStats]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Synchronize URL query params (?stage=4, ?stage=5, ?id=...)
  useEffect(() => {
    const s = searchParams.get("stage");
    if (s && !isNaN(Number(s))) {
      const stageNum = Number(s);
      setStageFilter(stageNum);
      if (stageNum === 4) setStatusFilter("HOD Approval Pending");
      else if (stageNum === 5) setStatusFilter("GM Approval Pending");
      setPage(1);
    }
    const prId = searchParams.get("id");
    if (prId) {
      itHelpdeskAPI.procurement
        .getById(prId)
        .then((res) => {
          if (res?.data) {
            handleOpenWorkflow(res.data);
            if (res.data.current_stage === 4 || res.data.current_stage === 5) {
              setWorkflowTab(2); // Directly open Approvals tab
            }
          }
        })
        .catch((err) => console.warn("Failed to load PR from query params:", err));
    }
  }, [searchParams]);

  // Open New PR Modal
  const handleOpenNewPrModal = async () => {
    try {
      const res = await itHelpdeskAPI.procurement.getNextPr();
      setPrForm({
        pr_number: res?.next_pr_number || `PR-${new Date().getFullYear()}-001`,
        item_name: "",
        category: "Computer / Desktop",
        quantity: 1,
        estimated_budget: "",
        budget_head: "IT CapEx",
        priority: "Normal",
        branch: "Head Office",
        justification: "",
        required_by_date: "",
        processor: "",
        ram: "",
        storage: "",
      });
      setNewPrModalOpen(true);
    } catch (err) {
      toast.error("Failed to generate PR sequence");
    }
  };

  // Submit New PR
  const handleCreatePR = async (e) => {
    e?.preventDefault();
    if (!prForm.item_name || !prForm.estimated_budget) {
      toast.error("Please fill in Item Name and Estimated Budget");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        pr_number: prForm.pr_number,
        branch: prForm.branch,
        required_by_date: prForm.required_by_date || null,
        item_details: {
          item_name: prForm.item_name,
          category: prForm.category,
          quantity: parseInt(prForm.quantity, 10) || 1,
          estimated_budget: parseFloat(prForm.estimated_budget) || 0,
          budget_head: prForm.budget_head,
          priority: prForm.priority,
          justification: prForm.justification,
          specifications: {
            processor: prForm.processor,
            ram: prForm.ram,
            storage: prForm.storage,
          },
        },
      };

      await itHelpdeskAPI.procurement.create(payload);
      toast.success(`Purchase Request ${prForm.pr_number} created!`);
      setNewPrModalOpen(false);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create PR");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Workflow Modal for specific PR
  const handleOpenWorkflow = async (pr) => {
    try {
      if (!vendorList || vendorList.length === 0) {
        fetchVendors();
      }
      const res = await itHelpdeskAPI.procurement.getById(pr._id);
      const data = res?.data || pr;
      setSelectedPR(data);

      // Populate quotes list (ensure at least 3 quote slots exist)
      let qList = Array.isArray(data.quotations) ? [...data.quotations] : [];
      while (qList.length < 3) {
        qList.push({
          quotation_no: `QTN-00${qList.length + 1}`,
          vendor_name: "",
          total_amount: "",
          warranty_period: "1 Year",
          delivery_days: 7,
          payment_terms: "30 Days Credit",
          file_url: "",
          notes: "",
        });
      }
      const activeRecommendedNo = data.it_evaluation?.recommended_quote_no || "";
      if (activeRecommendedNo) {
        qList = qList.map((q) => ({
          ...q,
          is_recommended_by_it: q.quotation_no === activeRecommendedNo,
        }));
      }
      setQuotesList(qList);

      // Populate Evaluation Form
      setItEvalForm({
        decision: data.it_evaluation?.decision || "Approved",
        recommended_vendor: data.it_evaluation?.recommended_vendor || "",
        recommended_quote_no: activeRecommendedNo,
        remarks: data.it_evaluation?.remarks || "",
      });

      // Populate HOD Form
      setHodForm({
        decision: data.first_approval?.decision || "Approved",
        approved_amount: data.first_approval?.approved_amount || data.item_details?.estimated_budget || "",
        remarks: data.first_approval?.remarks || "",
      });

      // Populate GM Form
      setGmForm({
        decision: data.final_approval?.decision || "Approved",
        selected_vendor: data.final_approval?.selected_vendor || data.it_evaluation?.recommended_vendor || "",
        selected_quote_no: data.final_approval?.selected_quote_no || data.it_evaluation?.recommended_quote_no || "",
        final_approved_amount: data.final_approval?.final_approved_amount || data.first_approval?.approved_amount || "",
        remarks: data.final_approval?.remarks || "",
      });

      // Populate PO Form
      setPoForm({
        po_number: data.purchase_order?.po_number || `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        po_date: data.purchase_order?.po_date ? data.purchase_order.po_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        po_amount: data.purchase_order?.po_amount || data.final_approval?.final_approved_amount || "",
        po_file_url: data.purchase_order?.po_file_url || "",
        expected_delivery: data.purchase_order?.expected_delivery ? data.purchase_order.expected_delivery.slice(0, 10) : "",
        notes: data.purchase_order?.notes || "",
      });

      // Populate GRN Form
      setGrnForm({
        grn_number: data.grn_receiving?.grn_number || `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        received_date: data.grn_receiving?.received_date ? data.grn_receiving.received_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        received_qty: data.grn_receiving?.received_qty || data.item_details?.quantity || 1,
        serial_numbers_text: (data.grn_receiving?.serial_numbers || []).join(", "),
        delivery_challan_url: data.grn_receiving?.delivery_challan_url || "",
        inspection_status: data.grn_receiving?.inspection_status || "Accepted",
        receipt_status: data.grn_receiving?.receipt_status || "Received",
        remarks: data.grn_receiving?.remarks || "",
      });

      // Resolve vendor and GSTIN from Vendor Management master
      const resolvedVendorName =
        data.invoice_details?.vendor_name ||
        data.final_approval?.selected_vendor ||
        data.purchase_order?.vendor_name ||
        data.it_evaluation?.recommended_vendor ||
        data.quotations?.find((q) => q.is_selected_by_gm || q.is_recommended_by_it)?.vendor_name ||
        data.quotations?.[0]?.vendor_name ||
        "";

      const matchedVendor = (vendorList || []).find(
        (v) => (v.name || "").trim().toLowerCase() === resolvedVendorName.trim().toLowerCase()
      );

      const resolvedGstin =
        data.invoice_details?.gstin ||
        matchedVendor?.gst_number ||
        "";

      // Populate Invoice Form
      setInvoiceForm({
        vendor_name: resolvedVendorName,
        vendor_id: matchedVendor?._id || data.invoice_details?.vendor_id || null,
        invoice_number: data.invoice_details?.invoice_number || "",
        invoice_date: data.invoice_details?.invoice_date ? data.invoice_details.invoice_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        gstin: resolvedGstin,
        invoice_amount: data.invoice_details?.invoice_amount || data.purchase_order?.po_amount || "",
        invoice_url: data.invoice_details?.invoice_url || "",
        po_verified: data.invoice_details?.po_verified ?? true,
        grn_verified: data.invoice_details?.grn_verified ?? true,
        verification_status: data.invoice_details?.verification_status || "Verified",
        accounts_remarks: data.invoice_details?.accounts_remarks || "",
      });

      // Populate Payment Form
      setPaymentForm({
        payment_status: data.payment_details?.payment_status || "Processed",
        payment_mode: data.payment_details?.payment_mode || "Bank Transfer",
        paid_amount: data.payment_details?.paid_amount || data.invoice_details?.invoice_amount || "",
        payment_date: data.payment_details?.payment_date ? data.payment_details.payment_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        utr_number: data.payment_details?.utr_number || "",
        payment_proof_url: data.payment_details?.payment_proof_url || "",
        closure_remarks: data.payment_details?.closure_remarks || "",
      });

      // Populate Handover Form
      setHandoverForm({
        assigned_to_name: data.assignment_handover?.assigned_to_name || data.requested_by?.name || "",
        department: data.assignment_handover?.department || data.requested_by?.department || "",
        location: data.assignment_handover?.location || data.branch || "",
        handover_date: data.assignment_handover?.handover_date ? data.assignment_handover.handover_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        remarks: data.assignment_handover?.remarks || "",
      });

      // Set default tab based on current stage
      if (data.current_stage <= 2) setWorkflowTab(1); // Quotations
      else if (data.current_stage === 3) setWorkflowTab(1); // IT Eval
      else if (data.current_stage <= 5) setWorkflowTab(2); // Approvals
      else if (data.current_stage <= 7) setWorkflowTab(3); // PO & GRN
      else if (data.current_stage <= 9) setWorkflowTab(4); // Invoicing
      else if (data.current_stage >= 10) setWorkflowTab(5); // Payment & Asset Bridge

      setWorkflowModalOpen(true);
    } catch (err) {
      toast.error("Failed to load request workflow details");
    }
  };

  // Automatically sync vendor GSTIN from Vendor Management module when module / tab is selected
  useEffect(() => {
    if (!vendorList || vendorList.length === 0) return;

    const currentVendor =
      invoiceForm.vendor_name ||
      selectedPR?.final_approval?.selected_vendor ||
      selectedPR?.purchase_order?.vendor_name ||
      selectedPR?.it_evaluation?.recommended_vendor ||
      selectedPR?.quotations?.find((q) => q.is_selected_by_gm || q.is_recommended_by_it)?.vendor_name ||
      selectedPR?.quotations?.[0]?.vendor_name ||
      "";

    if (!currentVendor) return;

    const matched = vendorList.find(
      (v) => (v.name || "").trim().toLowerCase() === currentVendor.trim().toLowerCase()
    );

    if (matched && matched.gst_number) {
      setInvoiceForm((prev) => {
        if (!prev.gstin || !prev.vendor_name) {
          return {
            ...prev,
            vendor_name: prev.vendor_name || currentVendor,
            vendor_id: prev.vendor_id || matched._id,
            gstin: prev.gstin || matched.gst_number,
          };
        }
        return prev;
      });
    }
  }, [vendorList, selectedPR, workflowTab]);

  // Upload Generic Document handler
  const handleUploadDoc = async (file, onUploaded) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const toastId = toast.loading("Uploading document...");
    try {
      const res = await itHelpdeskAPI.procurement.uploadDoc(formData);
      if (res?.url) {
        toast.success("Document uploaded successfully!", { id: toastId });
        onUploaded(res.url);
      } else {
        toast.error("Upload failed", { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "File upload failed", { id: toastId });
    }
  };

  // Save Quotations (Stage 2)
  const handleSaveQuotations = async () => {
    setSubmitting(true);
    try {
      const activeQuoteNo = itEvalForm.recommended_quote_no || selectedPR?.it_evaluation?.recommended_quote_no;
      const cleanQuotes = quotesList
        .filter((q) => q.vendor_name || q.total_amount)
        .map((q) => ({
          ...q,
          is_recommended_by_it: Boolean(activeQuoteNo && q.quotation_no === activeQuoteNo),
        }));
      if (cleanQuotes.length === 0) {
        toast.error("Please provide at least 1 vendor quote");
        setSubmitting(false);
        return;
      }
      const res = await itHelpdeskAPI.procurement.uploadQuotations(selectedPR._id, {
        quotations: cleanQuotes,
        comparison_notes: "Vendor quotations updated in workflow",
      });
      toast.success("Quotations saved successfully!");
      if (res?.data) {
        setSelectedPR(res.data);
        if (Array.isArray(res.data.quotations) && res.data.quotations.length > 0) {
          let updatedQList = [...res.data.quotations];
          while (updatedQList.length < 3) {
            updatedQList.push({
              quotation_no: `QTN-00${updatedQList.length + 1}`,
              vendor_name: "",
              total_amount: "",
              warranty_period: "1 Year",
              delivery_days: 7,
              payment_terms: "30 Days Credit",
              file_url: "",
              notes: "",
            });
          }
          setQuotesList(updatedQList);
        }
      }
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quotations");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit IT Evaluation (Stage 3)
  const handleSubmitItEval = async () => {
    setSubmitting(true);
    try {
      const activeQuoteNo = itEvalForm.recommended_quote_no;
      const updatedQuotes = quotesList.map((item) => ({
        ...item,
        is_recommended_by_it: Boolean(activeQuoteNo && item.quotation_no === activeQuoteNo),
      }));
      const payload = {
        ...itEvalForm,
        quotations: updatedQuotes,
      };
      const res = await itHelpdeskAPI.procurement.evaluateIT(selectedPR._id, payload);
      toast.success(`IT Technical Evaluation recorded: ${itEvalForm.decision}`);
      if (res?.data) {
        setSelectedPR(res.data);
        if (Array.isArray(res.data.quotations) && res.data.quotations.length > 0) {
          let updatedQList = [...res.data.quotations];
          while (updatedQList.length < 3) {
            updatedQList.push({
              quotation_no: `QTN-00${updatedQList.length + 1}`,
              vendor_name: "",
              total_amount: "",
              warranty_period: "1 Year",
              delivery_days: 7,
              payment_terms: "30 Days Credit",
              file_url: "",
              notes: "",
            });
          }
          setQuotesList(updatedQList);
        }
      }
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record IT evaluation");
    } finally {
      setSubmitting(false);
    }
  };

  // Instant Auto-Save of Recommended Quote (Stage 3 API Call)
  const handleSelectRecommendedQuote = async (quoteNo) => {
    // 1. Immediately update quotesList so only the selected quote is recommended
    const updatedQuotes = quotesList.map((q) => ({
      ...q,
      is_recommended_by_it: Boolean(quoteNo && q.quotation_no === quoteNo),
    }));
    setQuotesList(updatedQuotes);

    // 2. Find selected quotation vendor details
    const found = updatedQuotes.find((q) => q.quotation_no === quoteNo);
    const updatedForm = {
      ...itEvalForm,
      decision: itEvalForm.decision || "Approved",
      recommended_quote_no: quoteNo || "",
      recommended_vendor: found?.vendor_name || "",
      remarks: itEvalForm.remarks || (found?.vendor_name ? `Recommended vendor: ${found.vendor_name} (₹${Number(found.total_amount || 0).toLocaleString("en-IN")})` : ""),
      quotations: updatedQuotes,
    };
    setItEvalForm(updatedForm);

    // 3. Immediately trigger API call to backend
    if (selectedPR?._id && quoteNo) {
      const toastId = toast.loading(`Saving recommendation: ${found?.vendor_name || quoteNo}...`);
      try {
        const res = await itHelpdeskAPI.procurement.evaluateIT(selectedPR._id, updatedForm);
        if (res?.data) {
          setSelectedPR(res.data);
          if (Array.isArray(res.data.quotations) && res.data.quotations.length > 0) {
            let updatedQList = [...res.data.quotations];
            while (updatedQList.length < 3) {
              updatedQList.push({
                quotation_no: `QTN-00${updatedQList.length + 1}`,
                vendor_name: "",
                total_amount: "",
                warranty_period: "1 Year",
                delivery_days: 7,
                payment_terms: "30 Days Credit",
                file_url: "",
                notes: "",
              });
            }
            setQuotesList(updatedQList);
          }
          toast.success(`✓ Recommended quote saved: ${found?.vendor_name || quoteNo}`, { id: toastId });
          fetchStats();
          fetchRequests();
        }
      } catch (err) {
        console.error("Auto-save recommended quote error:", err);
        toast.error(err.response?.data?.message || "Failed to save recommendation", { id: toastId });
      }
    }
  };

  // Submit HOD Approval (Stage 4 - Shalini Arun)
  const handleSubmitHodApproval = async () => {
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.approveHOD(selectedPR._id, hodForm);
      toast.success(`HOD / Admin decision submitted: ${hodForm.decision}`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit HOD decision");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit GM Approval (Stage 5 - Manu Pillai)
  const handleSubmitGmApproval = async () => {
    if (gmForm.decision === "Approved" && !gmForm.selected_vendor) {
      toast.error("Please select the winning vendor");
      return;
    }
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.approveGM(selectedPR._id, gmForm);
      toast.success(`Management decision recorded: ${gmForm.decision}`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record GM approval");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit PO (Stage 6)
  const handleSubmitPO = async () => {
    if (!poForm.po_number) {
      toast.error("PO Number is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.createPO(selectedPR._id, poForm);
      toast.success(`Purchase Order ${poForm.po_number} recorded!`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit GRN Receiving (Stage 7)
  const handleSubmitGRN = async () => {
    setSubmitting(true);
    try {
      const serials = grnForm.serial_numbers_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await itHelpdeskAPI.procurement.recordGRN(selectedPR._id, {
        ...grnForm,
        serial_numbers: serials,
      });
      toast.success(`Goods Receipt Note ${grnForm.grn_number} saved!`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record GRN");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Accounts Invoice Verification & 3-Way Match (Stage 8 & 9)
  const handleSubmitInvoiceVerify = async () => {
    if (!invoiceForm.invoice_number) {
      toast.error("Tax Invoice Number is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.verifyInvoice(selectedPR._id, invoiceForm);
      toast.success(`Accounts 3-Way Verification recorded: ${invoiceForm.verification_status}`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify invoice");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Payment & UTR (Stage 10)
  const handleSubmitPayment = async () => {
    if (!paymentForm.utr_number && paymentForm.payment_status === "Processed") {
      toast.error("Please provide UTR / Transaction Reference number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.recordPayment(selectedPR._id, paymentForm);
      toast.success(`Payment & UTR recorded successfully!`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  // One-Click "Register to Unified Hub" Button (Stage 11 Bridge)
  const handleRegisterToUnifiedHub = async () => {
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.convertToAsset(selectedPR._id, {});
      toast.success(res.message || "Asset registered successfully in Unified Hub!");
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register asset in Unified Hub");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Handover (Stage 12)
  const handleSubmitHandover = async () => {
    setSubmitting(true);
    try {
      const res = await itHelpdeskAPI.procurement.handover(selectedPR._id, handoverForm);
      toast.success(`Equipment allocated & Handover completed!`);
      setSelectedPR(res.data);
      fetchStats();
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete handover");
    } finally {
      setSubmitting(false);
    }
  };

  // Document Viewer Helper
  const openDocViewer = (url, title = "Procurement Document") => {
    if (!url) return;
    setDocViewerUrl(url);
    setDocViewerTitle(title);
  };

  // Helper for Status Badge Pill
  const getStatusChip = (status) => {
    let dotColor = "#64748b";
    let bg = "#f1f5f9";
    let text = "#334155";
    let border = "#cbd5e1";

    if (status === "Completed") {
      dotColor = "#10b981";
      bg = "#ecfdf5";
      text = "#065f46";
      border = "#a7f3d0";
    } else if (status === "Payment Pending") {
      dotColor = "#f59e0b";
      bg = "#fffbeb";
      text = "#92400e";
      border = "#fde68a";
    } else if (status === "Invoice Verification") {
      dotColor = "#0284c7";
      bg = "#f0f9ff";
      text = "#0369a1";
      border = "#bae6fd";
    } else if (status === "PO Created" || status === "Goods Received") {
      dotColor = "#4f46e5";
      bg = "#eef2ff";
      text = "#3730a3";
      border = "#c7d2fe";
    } else if (status === "HOD Approval Pending") {
      dotColor = "#7c3aed";
      bg = "#faf5ff";
      text = "#6b21a8";
      border = "#e9d5ff";
    } else if (status === "GM Approval Pending") {
      dotColor = "#059669";
      bg = "#f0fdf4";
      text = "#065f46";
      border = "#86efac";
    } else if (status === "Quotation Pending" || status === "IT Review") {
      dotColor = "#2563eb";
      bg = "#eff6ff";
      text = "#1e40af";
      border = "#bfdbfe";
    } else if (status === "Rejected") {
      dotColor = "#ef4444";
      bg = "#fef2f2";
      text = "#991b1b";
      border = "#fecaca";
    } else if (status === "Returned") {
      dotColor = "#ea580c";
      bg = "#fff7ed";
      text = "#9a3412";
      border = "#fed7aa";
    }

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.8,
          px: 1.4,
          py: 0.35,
          borderRadius: "20px",
          bgcolor: bg,
          color: text,
          border: `1px solid ${border}`,
          fontSize: "0.74rem",
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: dotColor,
            boxShadow: `0 0 0 2px ${bg}`,
          }}
        />
        {status || "In Review"}
      </Box>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: "#f8fafc", minHeight: "100vh" }}>
      {/* ── 1. HEADER & ACTION BAR ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              }}
            >
              <ShoppingCart size={24} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 750, color: "#0f172a", letterSpacing: "-0.02em" }}>
                IT Procurement, Quotation & Approval Hub
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.85rem", mt: 0.2 }}>
                Do not create an asset only after buying. Maintain the complete commercial and approval trail first.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/it-helpdesk/unified-assets")}
            startIcon={<Boxes size={18} />}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#fff",
              "&:hover": { bgcolor: "#f1f5f9", borderColor: "#94a3b8" },
            }}
          >
            Unified Asset Hub
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              fetchStats();
              fetchRequests();
            }}
            startIcon={<RefreshCw size={16} className={loading ? "spin" : ""} />}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#fff",
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={handleOpenNewPrModal}
            startIcon={<Plus size={18} />}
            sx={{
              bgcolor: "#4f46e5",
              color: "#fff",
              textTransform: "none",
              fontWeight: 650,
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
              "&:hover": { bgcolor: "#4338ca" },
            }}
          >
            New Purchase Request
          </Button>
        </Box>
      </Box>

      {/* ── 2. KPI METRICS CARDS BAR (Stage 4 & Stage 5 separated) ── */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { label: "Total Requests", val: stats.total, color: "#4f46e5", filter: "All", stage: "All" },
          { label: "Quotations Pending", val: stats.quotationPending, color: "#f59e0b", filter: "Quotation Pending", stage: 2 },
          { label: "IT Tech Review", val: stats.itReview, color: "#3b82f6", filter: "IT Review", stage: 3 },
          { label: "Stage 4: HOD Approval", val: stats.hodPending, color: "#7c3aed", filter: "HOD Approval Pending", stage: 4 },
          ...(!isHOD
            ? [{ label: "Stage 5: GM Approval", val: stats.gmPending, color: "#059669", filter: "GM Approval Pending", stage: 5 }]
            : []),
          { label: "Accounts & Pay", val: (stats.invoiceVerification || 0) + (stats.paymentPending || 0), color: "#ec4899", filter: "Invoice Verification", stage: 9 },
          { label: "Completed", val: stats.completed, color: "#10b981", filter: "Completed", stage: 12 },
        ].map((card, idx, arr) => {
          const isSelected = stageFilter === card.stage;
          return (
            <Grid item xs={6} sm={4} md={12 / arr.length} key={idx}>
              <Paper
                elevation={0}
                onClick={() => {
                  setStatusFilter(card.filter);
                  setStageFilter(card.stage);
                  setPage(1);
                }}
                sx={{
                  p: 1.8,
                  borderRadius: "10px",
                  border: "2px solid",
                  borderColor: isSelected ? card.color : "#e2e8f0",
                  bgcolor: isSelected ? `${card.color}0a` : "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                    borderColor: card.color,
                  },
                }}
              >
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 750, color: isSelected ? card.color : "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }} noWrap>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: "1.65rem", fontWeight: 800, color: card.color, mt: 0.3 }}>
                  {card.val}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* ── 2B. ROLE ACTION QUEUES: STAGE 4 HOD & STAGE 5 GM ── */}
      {isShaliniArun && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: "10px",
            bgcolor: stageFilter === 4 ? "#f3e8ff" : "#faf5ff",
            border: "1.5px solid #d8b4fe",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: "8px", bgcolor: "#ede9fe", color: "#7c3aed", display: "flex" }}>
              <CheckCircle2 size={24} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: "#581c87" }}>
                  Stage 4: HOD / Admin Quotation Approval Queue
                </Typography>
                <Chip
                  size="small"
                  label={`${stats.hodPending || 0} Awaiting HOD`}
                  sx={{ bgcolor: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                />
              </Box>
              <Typography sx={{ fontSize: "0.8rem", color: "#6b21a8", mt: 0.2 }}>
                IT Technical evaluation is complete. Review vendor quotations, warranty terms &amp; prices to provide HOD sign-off.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setStageFilter(4);
              setStatusFilter("HOD Approval Pending");
              setPage(1);
            }}
            sx={{
              bgcolor: "#7c3aed",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
              px: 2,
              "&:hover": { bgcolor: "#6b21a8" },
            }}
          >
            Filter Stage 4 Quotations ({stats.hodPending || 0})
          </Button>
        </Paper>
      )}

      {showStage5 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: "10px",
            bgcolor: stageFilter === 5 ? "#dcfce7" : "#f0fdf4",
            border: "1.5px solid #86efac",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: "8px", bgcolor: "#dcfce7", color: "#059669", display: "flex" }}>
              <ShieldCheck size={24} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", color: "#065f46" }}>
                  Stage 5: General Manager Approval &amp; Winner Quote Selection
                </Typography>
                <Chip
                  size="small"
                  label={`${stats.gmPending || 0} Awaiting GM`}
                  sx={{ bgcolor: "#059669", color: "#fff", fontWeight: 700, fontSize: "0.72rem" }}
                />
              </Box>
              <Typography sx={{ fontSize: "0.8rem", color: "#047857", mt: 0.2 }}>
                HOD commercial verification complete. Compare vendor quotes side-by-side, choose the winning quote, and authorize final amount.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setStageFilter(5);
              setStatusFilter("GM Approval Pending");
              setPage(1);
            }}
            sx={{
              bgcolor: "#059669",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
              px: 2,
              "&:hover": { bgcolor: "#047857" },
            }}
          >
            Filter Stage 5 Quotations ({stats.gmPending || 0})
          </Button>
        </Paper>
      )}

      {/* ── 3. INTERACTIVE 12-STAGE VISUAL PIPELINE STRIP ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Layers size={18} color="#4f46e5" />
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>
              End-to-End 12-Stage IT Procurement Lifecycle
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
            Click any stage to filter active requests
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(4, 1fr)", sm: "repeat(6, 1fr)", md: "repeat(12, 1fr)" }, gap: 1 }}>
          {STAGES.map((s) => {
            const isSelected = stageFilter === s.id;
            return (
              <Box
                key={s.id}
                onClick={() => {
                  setStageFilter(isSelected ? "All" : s.id);
                  setPage(1);
                }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 1,
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: isSelected ? "#4f46e5" : "#e2e8f0",
                  bgcolor: isSelected ? "#eef2ff" : "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "#f1f5f9", borderColor: "#cbd5e1" },
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    bgcolor: isSelected ? "#4f46e5" : "#e2e8f0",
                    color: isSelected ? "#fff" : "#475569",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  {s.id}
                </Box>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 650, color: "#1e293b", textAlign: "center", lineHeight: 1.2 }}>
                  {s.short}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ── 4. SEARCH & FILTER TOOLBAR ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search PR No, item, requester, vendor, PO..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, color: "#94a3b8" }} />,
              }}
            />
          </Grid>

          <Grid item xs={6} sm={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Branch"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="All">All Branches</MenuItem>
              {BRANCHES.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="All">All Categories</MenuItem>
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={6} sm={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Overall Status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Quotation Pending">Quotation Pending</MenuItem>
              <MenuItem value="IT Review">IT Review</MenuItem>
              <MenuItem value="HOD Approval Pending">HOD Approval Pending</MenuItem>
              <MenuItem value="GM Approval Pending">GM Approval Pending</MenuItem>
              <MenuItem value="PO Created">PO Created</MenuItem>
              <MenuItem value="Goods Received">Goods Received</MenuItem>
              <MenuItem value="Invoice Verification">Invoice Verification</MenuItem>
              <MenuItem value="Payment Pending">Payment Pending</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Returned">Returned</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={6} sm={2} sx={{ display: "flex", gap: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchTerm("");
                setBranchFilter("All");
                setCategoryFilter("All");
                setStatusFilter("All");
                setStageFilter("All");
                setPage(1);
              }}
              sx={{ textTransform: "none", borderColor: "#cbd5e1", color: "#475569" }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* ── 5. PRIMARY DATA TABLE ── */}
      <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", bgcolor: "#fff" }}>
        <Box sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>REQUEST ID</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>REQUESTER / BRANCH</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>ITEM &amp; QUANTITY</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>VENDOR &amp; AMOUNT</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>STAGE &amp; STATUS</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>PO / GRN</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>ACCOUNTS / UTR</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem" }}>LINKED ASSET</th>
                <th style={{ padding: "12px 16px", color: "#64748b", fontWeight: 700, fontSize: "0.75rem", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                    <CircularProgress size={32} sx={{ color: "#4f46e5" }} />
                    <Typography sx={{ color: "#64748b", mt: 1 }}>Loading procurement records...</Typography>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                    <ShoppingCart size={36} style={{ color: "#cbd5e1", marginBottom: 8 }} />
                    <Typography sx={{ fontWeight: 600 }}>No procurement requests found</Typography>
                    <Typography sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      Create a new request or adjust filters above
                    </Typography>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const finalAmount =
                    row.final_approval?.final_approved_amount ||
                    row.first_approval?.approved_amount ||
                    row.item_details?.estimated_budget ||
                    0;
                  const selectedVendor =
                    row.final_approval?.selected_vendor ||
                    row.it_evaluation?.recommended_vendor ||
                    (row.quotations?.length ? `${row.quotations.length} Quotes in Review` : "Awaiting Quotes");

                  return (
                    <tr
                      key={row._id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                    >
                      {/* 1. Request ID */}
                      <td style={{ padding: "14px 16px" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontWeight: 750, color: "#1e293b", fontFamily: "monospace", fontSize: "0.85rem" }}>
                            {row.pr_number}
                          </Typography>
                          {row.item_details?.priority === "Urgent" && (
                            <Chip size="small" label="Urgent" color="error" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                          )}
                          {row.item_details?.priority === "High" && (
                            <Chip size="small" label="High" color="warning" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 0.3 }}>
                          {row.request_date ? new Date(row.request_date).toLocaleDateString() : ""}
                        </Typography>
                      </td>

                      {/* 2. Requester & Branch */}
                      <td style={{ padding: "14px 16px" }}>
                        <Typography sx={{ fontWeight: 650, color: "#334155" }}>
                          {row.requested_by?.name || "IT Dept"}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#64748b", fontSize: "0.75rem" }}>
                          <Building2 size={12} />
                          <span>{row.branch || "Head Office"}</span>
                          <span>•</span>
                          <span>{row.requested_by?.department || "IT"}</span>
                        </Box>
                      </td>

                      {/* 3. Item & Quantity */}
                      <td style={{ padding: "14px 16px" }}>
                        <Typography sx={{ fontWeight: 650, color: "#1e293b" }}>
                          {row.item_details?.item_name}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
                          <Chip
                            size="small"
                            label={`${row.item_details?.quantity || 1} Units`}
                            sx={{ height: 20, fontSize: "0.7rem", bgcolor: "#eef2ff", color: "#4f46e5", fontWeight: 600 }}
                          />
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {row.item_details?.category}
                          </Typography>
                        </Box>
                      </td>

                      {/* 4. Vendor & Approved ₹ */}
                      <td style={{ padding: "14px 16px" }}>
                        <Typography sx={{ fontWeight: 650, color: "#0f172a" }}>
                          ₹{finalAmount.toLocaleString("en-IN")}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.3 }} noWrap>
                          {selectedVendor}
                        </Typography>
                      </td>

                      {/* 5. Stage & Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          {getStatusChip(row.overall_status)}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box sx={{ flex: 1, height: 4, bgcolor: "#e2e8f0", borderRadius: 2, overflow: "hidden", minWidth: 60 }}>
                            <Box
                              sx={{
                                width: `${Math.round(((row.current_stage || 1) / 12) * 100)}%`,
                                height: "100%",
                                bgcolor: row.overall_status === "Rejected" ? "#ef4444" : "#4f46e5",
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
                            Stage {row.current_stage || 1}/12
                          </Typography>
                        </Box>
                      </td>

                      {/* 6. PO / GRN */}
                      <td style={{ padding: "14px 16px" }}>
                        {row.purchase_order?.po_number ? (
                          <Box>
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>
                              {row.purchase_order.po_number}
                            </Typography>
                            {row.grn_receiving?.grn_number ? (
                              <Chip
                                size="small"
                                label={`GRN Received (${row.grn_receiving.received_qty || 1})`}
                                sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#ecfdf5", color: "#059669", fontWeight: 600, mt: 0.3 }}
                              />
                            ) : (
                              <Typography sx={{ fontSize: "0.7rem", color: "#d97706" }}>GRN Pending</Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>PO Not Issued</Typography>
                        )}
                      </td>

                      {/* 7. Accounts / UTR */}
                      <td style={{ padding: "14px 16px" }}>
                        {row.payment_details?.utr_number ? (
                          <Box>
                            <Chip size="small" label="Paid" color="success" sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                            <Typography sx={{ fontSize: "0.7rem", color: "#64748b", fontFamily: "monospace", mt: 0.3 }}>
                              UTR: {row.payment_details.utr_number.slice(0, 14)}...
                            </Typography>
                          </Box>
                        ) : row.invoice_details?.verification_status === "Verified" ? (
                          <Chip size="small" label="3-Way Match OK" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 600 }} />
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8" }}>Pending</Typography>
                        )}
                      </td>

                      {/* 8. Linked Asset */}
                      <td style={{ padding: "14px 16px" }}>
                        {row.asset_bridge?.is_registered ? (
                          <Chip
                            size="small"
                            component={Link}
                            to={`/it-helpdesk/unified-assets?search=${row.asset_bridge.asset_tag}`}
                            label={row.asset_bridge.asset_tag}
                            icon={<Boxes size={14} />}
                            clickable
                            sx={{
                              bgcolor: "#e0e7ff",
                              color: "#3730a3",
                              fontWeight: 750,
                              fontFamily: "monospace",
                              cursor: "pointer",
                            }}
                          />
                        ) : row.current_stage >= 10 ? (
                          <Chip size="small" label="Ready to Register" sx={{ bgcolor: "#fef3c7", color: "#b45309", fontWeight: 600 }} />
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Not Registered</Typography>
                        )}
                      </td>

                      {/* 9. Action Button */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleOpenWorkflow(row)}
                          endIcon={<ArrowRight size={14} />}
                          sx={{
                            bgcolor:
                              row.current_stage === 4
                                ? "#7c3aed"
                                : row.current_stage === 5
                                ? "#059669"
                                : "#4f46e5",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: 650,
                            fontSize: "0.78rem",
                            px: 1.8,
                            "&:hover": {
                              bgcolor:
                                row.current_stage === 4
                                  ? "#6b21a8"
                                  : row.current_stage === 5
                                  ? "#047857"
                                  : "#4338ca",
                            },
                          }}
                        >
                          {row.current_stage === 4
                            ? "HOD Review Quotes"
                            : row.current_stage === 5
                            ? "GM Select & Approve"
                            : "Open Workflow"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Box>

        {/* Pagination Bar */}
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>
            Showing page {page} of {totalPages} ({stats.total} total requests)
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              sx={{ textTransform: "none", color: "#475569" }}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              sx={{ textTransform: "none", color: "#475569" }}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ── 6. NEW PURCHASE REQUEST MODAL ── */}
      <Dialog
        open={newPrModalOpen}
        onClose={() => setNewPrModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px" } }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", pb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 750, color: "#0f172a" }}>
              New IT Purchase Request (PR)
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.8rem" }}>
              Commercial &amp; approval trail will be initialized automatically
            </Typography>
          </Box>
          <IconButton onClick={() => setNewPrModalOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleCreatePR}>
          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="PR Number"
                  value={prForm.pr_number}
                  disabled
                  helperText="Auto-generated sequential number"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Branch / Location *"
                  value={prForm.branch}
                  onChange={(e) => setPrForm({ ...prForm, branch: e.target.value })}
                >
                  {BRANCHES.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Required By Date"
                  InputLabelProps={{ shrink: true }}
                  value={prForm.required_by_date}
                  onChange={(e) => setPrForm({ ...prForm, required_by_date: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Item / Requirement Title *"
                  placeholder="e.g. Dell OptiPlex Desktop i7 / HP LaserJet Pro"
                  value={prForm.item_name}
                  onChange={(e) => setPrForm({ ...prForm, item_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Category *"
                  value={prForm.category}
                  onChange={(e) => setPrForm({ ...prForm, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Quantity *"
                  inputProps={{ min: 1 }}
                  value={prForm.quantity}
                  onChange={(e) => setPrForm({ ...prForm, quantity: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Estimated Budget (₹) *"
                  placeholder="e.g. 65000"
                  value={prForm.estimated_budget}
                  onChange={(e) => setPrForm({ ...prForm, estimated_budget: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Budget Head"
                  value={prForm.budget_head}
                  onChange={(e) => setPrForm({ ...prForm, budget_head: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Priority"
                  value={prForm.priority}
                  onChange={(e) => setPrForm({ ...prForm, priority: e.target.value })}
                >
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Business / Technical Justification *"
                  placeholder="Explain why this equipment is needed, user impact, or legacy asset being replaced..."
                  value={prForm.justification}
                  onChange={(e) => setPrForm({ ...prForm, justification: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", mb: 1 }}>
                  Technical Specifications (Optional)
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Processor / CPU"
                      placeholder="e.g. Core i7 13th Gen"
                      value={prForm.processor}
                      onChange={(e) => setPrForm({ ...prForm, processor: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="RAM"
                      placeholder="e.g. 16 GB DDR5"
                      value={prForm.ram}
                      onChange={(e) => setPrForm({ ...prForm, ram: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Storage"
                      placeholder="e.g. 512 GB NVMe SSD"
                      value={prForm.storage}
                      onChange={(e) => setPrForm({ ...prForm, storage: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, borderTop: "1px solid #e2e8f0" }}>
            <Button onClick={() => setNewPrModalOpen(false)} sx={{ textTransform: "none", color: "#64748b" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650, px: 3, "&:hover": { bgcolor: "#4338ca" } }}
            >
              {submitting ? <CircularProgress size={20} color="inherit" /> : "Submit Purchase Request"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── 7. COMPREHENSIVE WORKFLOW & APPROVAL MODAL (ENTERPRISE GRADE UI) ── */}
      {selectedPR && (
        <Dialog
          open={workflowModalOpen}
          onClose={() => setWorkflowModalOpen(false)}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
              height: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.3)",
              border: "1px solid rgba(226, 232, 240, 0.9)",
              bgcolor: "#ffffff",
            },
          }}
        >
          {/* Top Decorative Gradient Accent Bar */}
          <Box
            sx={{
              height: 4,
              width: "100%",
              background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 30%, #06b6d4 70%, #10b981 100%)",
            }}
          />

          {/* Modal Header */}
          <DialogTitle
            sx={{
              p: 2.5,
              px: 3.5,
              borderBottom: "1px solid #e2e8f0",
              bgcolor: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                  border: "1.5px solid #c7d2fe",
                  display: "grid",
                  placeItems: "center",
                  color: "#4f46e5",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.12)",
                  flexShrink: 0,
                }}
              >
                <ShoppingCart size={24} />
              </Box>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, flexWrap: "wrap" }}>
                  <Typography
                    sx={{
                      fontWeight: 850,
                      color: "#0f172a",
                      fontSize: "1.25rem",
                      letterSpacing: "-0.02em",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedPR.pr_number}
                  </Typography>
                  {getStatusChip(selectedPR.overall_status)}
                  {selectedPR.item_details?.priority && (
                    <Chip
                      size="small"
                      label={`${selectedPR.item_details.priority} Priority`}
                      sx={{
                        fontSize: "0.7rem",
                        height: 22,
                        fontWeight: 750,
                        bgcolor:
                          selectedPR.item_details.priority === "Urgent"
                            ? "#fee2e2"
                            : selectedPR.item_details.priority === "High"
                            ? "#ffedd5"
                            : "#f1f5f9",
                        color:
                          selectedPR.item_details.priority === "Urgent"
                            ? "#b91c1c"
                            : selectedPR.item_details.priority === "High"
                            ? "#c2410c"
                            : "#475569",
                        border: "1px solid",
                        borderColor:
                          selectedPR.item_details.priority === "Urgent"
                            ? "#fca5a5"
                            : selectedPR.item_details.priority === "High"
                            ? "#fdba74"
                            : "#cbd5e1",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{ color: "#1e293b", fontSize: "0.85rem", fontWeight: 650 }}>
                    {selectedPR.item_details?.item_name || "IT Equipment"}
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#cbd5e1" }} />
                  <Typography sx={{ color: "#64748b", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Boxes size={13} color="#64748b" /> {selectedPR.item_details?.quantity || 1} Units
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#cbd5e1" }} />
                  <Typography sx={{ color: "#64748b", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                    <User size={13} color="#64748b" /> Requested by <b>{selectedPR.requested_by?.name || "IT"}</b>
                  </Typography>
                  <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "#cbd5e1" }} />
                  <Typography sx={{ color: "#64748b", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Building2 size={13} color="#64748b" /> {selectedPR.branch || "Head Office"}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  bgcolor: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  px: 2.2,
                  py: 0.8,
                  borderRadius: "12px",
                  textAlign: "right",
                  minWidth: 150,
                  boxShadow: "0 2px 6px rgba(16, 185, 129, 0.08)",
                }}
              >
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Estimated Budget
                </Typography>
                <Typography sx={{ fontSize: "1.25rem", fontWeight: 850, color: "#14532d", lineHeight: 1.15 }}>
                  ₹{(selectedPR.item_details?.estimated_budget || 0).toLocaleString("en-IN")}
                </Typography>
              </Box>
              <IconButton
                onClick={() => setWorkflowModalOpen(false)}
                sx={{
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  "&:hover": { bgcolor: "#f1f5f9", borderColor: "#cbd5e1", transform: "scale(1.05)" },
                  transition: "all 0.15s ease",
                  borderRadius: "10px",
                  p: 1,
                  color: "#475569",
                }}
              >
                <X size={20} />
              </IconButton>
            </Box>
          </DialogTitle>

          {/* Stepper Progress Sub-Header (Interactive 12-Stage Visual Tracker) */}
          <Box sx={{ px: 3.5, py: 1.2, bgcolor: "#faf5ff", borderBottom: "1px solid #f3e8ff" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, overflowX: "auto" }}>
              {STAGES.map((s, idx) => {
                const isPassed = (selectedPR.current_stage || 1) > s.id;
                const isCurrent = (selectedPR.current_stage || 1) === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <Box
                      onClick={() => {
                        if (s.id === 1) setWorkflowTab(0);
                        else if (s.id === 2 || s.id === 3) setWorkflowTab(1);
                        else if (s.id === 4 || s.id === 5) setWorkflowTab(2);
                        else if (s.id === 6 || s.id === 7) setWorkflowTab(3);
                        else if (s.id === 8 || s.id === 9) setWorkflowTab(4);
                        else if (s.id >= 10) setWorkflowTab(5);
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.8,
                        py: 0.4,
                        px: 1,
                        borderRadius: "8px",
                        cursor: "pointer",
                        bgcolor: isCurrent ? "#ffffff" : isPassed ? "rgba(236, 253, 245, 0.7)" : "transparent",
                        border: "1px solid",
                        borderColor: isCurrent ? "#7c3aed" : isPassed ? "#a7f3d0" : "transparent",
                        boxShadow: isCurrent ? "0 2px 8px rgba(124, 58, 237, 0.18)" : "none",
                        transition: "all 0.15s ease",
                        "&:hover": { bgcolor: isCurrent ? "#ffffff" : "#f3e8ff" },
                        flexShrink: 0,
                      }}
                      title={`Stage ${s.id}: ${s.title}`}
                    >
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          bgcolor: isCurrent ? "#7c3aed" : isPassed ? "#10b981" : "#e2e8f0",
                          color: isCurrent || isPassed ? "#fff" : "#64748b",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          boxShadow: isCurrent ? "0 0 0 3px rgba(124, 58, 237, 0.25)" : "none",
                        }}
                      >
                        {isPassed ? "✓" : s.id}
                      </Box>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: isCurrent ? 800 : isPassed ? 700 : 600,
                          color: isCurrent ? "#6b21a8" : isPassed ? "#047857" : "#64748b",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.short}
                      </Typography>
                    </Box>

                    {idx < STAGES.length - 1 && (
                      <Box
                        sx={{
                          flex: 1,
                          height: 2,
                          minWidth: 8,
                          bgcolor: (selectedPR.current_stage || 1) > s.id ? "#10b981" : "#e2e8f0",
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>

          {/* Segmented Pill Navigation Tabs */}
          <Box
            sx={{
              px: 3,
              py: 1.2,
              bgcolor: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 1,
              overflowX: "auto",
              "&::-webkit-scrollbar": { height: 4 },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 2 },
            }}
          >
            {[
              { id: 0, label: "1. Overview & Specs", icon: FileText },
              {
                id: 1,
                label: "2. 3 Quotes & IT Eval",
                icon: FileSpreadsheet,
                badge: selectedPR.quotations?.length ? `${selectedPR.quotations.length} Quotes` : null,
              },
              {
                id: 2,
                label: isHOD && !isGM ? "3. Stage 4: HOD Sign-Off" : "3. Approvals (HOD & GM)",
                icon: ShieldCheck,
              },
              { id: 3, label: "4. PO & GRN Receiving", icon: Truck },
              { id: 4, label: "5. Invoice & 3-Way Match", icon: Receipt },
              { id: 5, label: "6. Payment & Asset Bridge", icon: CreditCard },
              { id: 6, label: "7. Workflow Audit", icon: History },
            ].map((tab) => {
              const isActive = workflowTab === tab.id;
              const IconComp = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setWorkflowTab(tab.id)}
                  startIcon={<IconComp size={16} />}
                  sx={{
                    px: 1.8,
                    py: 0.85,
                    borderRadius: "10px",
                    textTransform: "none",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 750 : 600,
                    whiteSpace: "nowrap",
                    bgcolor: isActive ? "#4f46e5" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    border: "1px solid",
                    borderColor: isActive ? "#4f46e5" : "#e2e8f0",
                    boxShadow: isActive ? "0 4px 12px rgba(79, 70, 229, 0.22)" : "none",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: isActive ? "#4338ca" : "#f8fafc",
                      borderColor: isActive ? "#4338ca" : "#cbd5e1",
                      color: isActive ? "#ffffff" : "#0f172a",
                    },
                  }}
                >
                  {tab.label}
                  {tab.badge && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 0.9,
                        py: 0.15,
                        borderRadius: "10px",
                        fontSize: "0.68rem",
                        fontWeight: 750,
                        bgcolor: isActive ? "rgba(255,255,255,0.25)" : "#ede9fe",
                        color: isActive ? "#ffffff" : "#6d28d9",
                      }}
                    >
                      {tab.badge}
                    </Box>
                  )}
                </Button>
              );
            })}
          </Box>

          {/* Tab Content Container */}
          <DialogContent sx={{ p: 3.5, flex: 1, overflowY: "auto", bgcolor: "#f8fafc" }}>
            {/* ── TAB 0: OVERVIEW & SPECS ── */}
            {workflowTab === 0 && (
              <Box>
                {/* 4-Stat Metric Summary Bar */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "10px",
                          bgcolor: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          display: "grid",
                          placeItems: "center",
                          color: "#059669",
                        }}
                      >
                        <CreditCard size={20} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Estimated Budget
                        </Typography>
                        <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46", lineHeight: 1.1 }}>
                          ₹{(selectedPR.item_details?.estimated_budget || 0).toLocaleString("en-IN")}
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "#059669", mt: 0.2 }}>
                          {selectedPR.item_details?.budget_head || "IT CapEx"}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "10px",
                          bgcolor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          display: "grid",
                          placeItems: "center",
                          color: "#2563eb",
                        }}
                      >
                        <Laptop size={20} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Hardware Item
                        </Typography>
                        <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#1e3a8a", lineHeight: 1.1 }} noWrap>
                          {selectedPR.item_details?.item_name || "IT Asset"}
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "#2563eb", mt: 0.2 }}>
                          {selectedPR.item_details?.quantity || 1} Units • {selectedPR.item_details?.category || "Device"}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "10px",
                          bgcolor: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          display: "grid",
                          placeItems: "center",
                          color: "#7c3aed",
                        }}
                      >
                        <Layers size={20} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Current Workflow Phase
                        </Typography>
                        <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#581c87", lineHeight: 1.1 }}>
                          Stage {selectedPR.current_stage || 1} of 12
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "#7c3aed", mt: 0.2 }}>
                          {STAGES.find((s) => s.id === (selectedPR.current_stage || 1))?.title || "Purchase Request"}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "10px",
                          bgcolor: "#fffbeb",
                          border: "1px solid #fde68a",
                          display: "grid",
                          placeItems: "center",
                          color: "#d97706",
                        }}
                      >
                        <Clock size={20} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          Priority &amp; Required Date
                        </Typography>
                        <Typography sx={{ fontSize: "1.05rem", fontWeight: 800, color: "#78350f", lineHeight: 1.1 }}>
                          {selectedPR.item_details?.priority || "Normal"} Priority
                        </Typography>
                        <Typography sx={{ fontSize: "0.7rem", color: "#d97706", mt: 0.2 }}>
                          {selectedPR.required_by_date
                            ? `Needed by ${new Date(selectedPR.required_by_date).toLocaleDateString()}`
                            : "Standard Procurement SLA"}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>

                {/* 2 Main Detailed Cards */}
                <Grid container spacing={3}>
                  {/* Left Card: Equipment Specifications & Business Justification */}
                  <Grid item xs={12} md={7}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            bgcolor: "#eef2ff",
                            color: "#4f46e5",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Laptop size={18} />
                        </Box>
                        <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                          Equipment Details &amp; Request Scope
                        </Typography>
                      </Box>

                      {/* 2x2 Info Tiles Grid */}
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.8, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 750, color: "#64748b", textTransform: "uppercase" }}>
                              Item Name
                            </Typography>
                            <Typography sx={{ fontWeight: 750, color: "#0f172a", fontSize: "0.95rem", mt: 0.3 }}>
                              {selectedPR.item_details?.item_name || "N/A"}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.8, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 750, color: "#64748b", textTransform: "uppercase" }}>
                              Category
                            </Typography>
                            <Box sx={{ mt: 0.3 }}>
                              <Chip
                                size="small"
                                icon={<Tag size={12} />}
                                label={selectedPR.item_details?.category || "Equipment"}
                                sx={{ bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.75rem" }}
                              />
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.8, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 750, color: "#64748b", textTransform: "uppercase" }}>
                              Quantity Requested
                            </Typography>
                            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", mt: 0.3 }}>
                              {selectedPR.item_details?.quantity || 1} Units
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Box sx={{ p: 1.8, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 750, color: "#64748b", textTransform: "uppercase" }}>
                              Budget Head
                            </Typography>
                            <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem", mt: 0.3 }}>
                              {selectedPR.item_details?.budget_head || "IT CapEx"}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Hardware Specifications if present */}
                      {(selectedPR.item_details?.specifications?.processor ||
                        selectedPR.item_details?.specifications?.ram ||
                        selectedPR.item_details?.specifications?.storage) && (
                        <Box sx={{ mt: 2.5, p: 2, borderRadius: "10px", bgcolor: "#faf5ff", border: "1px solid #f3e8ff" }}>
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#6b21a8", textTransform: "uppercase", mb: 1 }}>
                            Hardware Specifications
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {selectedPR.item_details.specifications.processor && (
                              <Chip
                                size="small"
                                icon={<Cpu size={13} />}
                                label={`CPU: ${selectedPR.item_details.specifications.processor}`}
                                sx={{ bgcolor: "#fff", border: "1px solid #d8b4fe", color: "#581c87", fontWeight: 650 }}
                              />
                            )}
                            {selectedPR.item_details.specifications.ram && (
                              <Chip
                                size="small"
                                icon={<Boxes size={13} />}
                                label={`RAM: ${selectedPR.item_details.specifications.ram}`}
                                sx={{ bgcolor: "#fff", border: "1px solid #d8b4fe", color: "#581c87", fontWeight: 650 }}
                              />
                            )}
                            {selectedPR.item_details.specifications.storage && (
                              <Chip
                                size="small"
                                icon={<HardDrive size={13} />}
                                label={`Storage: ${selectedPR.item_details.specifications.storage}`}
                                sx={{ bgcolor: "#fff", border: "1px solid #d8b4fe", color: "#581c87", fontWeight: 650 }}
                              />
                            )}
                          </Box>
                        </Box>
                      )}

                      {/* Business Justification */}
                      <Box
                        sx={{
                          mt: 2.5,
                          p: 2,
                          borderRadius: "10px",
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderLeft: "4px solid #4f46e5",
                          flex: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.8 }}>
                          <FileText size={16} color="#4f46e5" />
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Business Justification &amp; Purpose
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, fontStyle: "italic" }}>
                          "{selectedPR.item_details?.justification || "No specific business justification was provided for this purchase request."}"
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Right Card: Requester & Workflow Hierarchy */}
                  <Grid item xs={12} md={5}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        bgcolor: "#fff",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "10px",
                            bgcolor: "#ecfdf5",
                            color: "#059669",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <UserCheck size={18} />
                        </Box>
                        <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                          Requester &amp; Allocation Profile
                        </Typography>
                      </Box>

                      {/* User Profile Tile */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "12px",
                          bgcolor: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.8,
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                            color: "#fff",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
                          }}
                        >
                          {String(selectedPR.requested_by?.name || "IT")
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                            Initiated By
                          </Typography>
                          <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }} noWrap>
                            {selectedPR.requested_by?.name || "IT Staff"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }} noWrap>
                            {selectedPR.requested_by?.email || "internal@system.local"}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Branch & Timestamp */}
                      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                        <Grid item xs={6}>
                          <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#64748b", mb: 0.3 }}>
                              <Building2 size={14} />
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 750, textTransform: "uppercase" }}>Branch</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 750, color: "#0f172a", fontSize: "0.88rem" }}>
                              {selectedPR.branch || "Head Office"}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={6}>
                          <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#64748b", mb: 0.3 }}>
                              <Calendar size={14} />
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 750, textTransform: "uppercase" }}>Request Date</Typography>
                            </Box>
                            <Typography sx={{ fontWeight: 750, color: "#0f172a", fontSize: "0.85rem" }}>
                              {selectedPR.request_date ? new Date(selectedPR.request_date).toLocaleDateString() : "N/A"}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Approval Chain Visual Route */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: "12px",
                          bgcolor: "#faf5ff",
                          border: "1px solid #f3e8ff",
                          flex: 1,
                        }}
                      >
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#581c87", textTransform: "uppercase", mb: 1.5 }}>
                          Governance &amp; Approval Route
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981" }} />
                              <Typography sx={{ fontSize: "0.8rem", fontWeight: 650, color: "#1e293b" }}>1. Requester Initiated</Typography>
                            </Box>
                            <Chip size="small" label="Submitted" sx={{ height: 20, fontSize: "0.68rem", bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700 }} />
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: selectedPR.current_stage >= 3 ? "#10b981" : "#f59e0b" }} />
                              <Typography sx={{ fontSize: "0.8rem", fontWeight: 650, color: "#1e293b" }}>2. IT Technical Evaluation</Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={selectedPR.it_evaluation?.decision || (selectedPR.current_stage >= 3 ? "Complete" : "In Progress")}
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                bgcolor: selectedPR.current_stage >= 3 ? "#dcfce7" : "#fef3c7",
                                color: selectedPR.current_stage >= 3 ? "#15803d" : "#b45309",
                                fontWeight: 700,
                              }}
                            />
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: selectedPR.first_approval?.decision === "Approved" ? "#10b981" : "#8b5cf6" }} />
                              <Typography sx={{ fontSize: "0.8rem", fontWeight: 650, color: "#1e293b" }}>3. Stage 4: HOD Sign-Off (Shalini Arun)</Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={selectedPR.first_approval?.decision || "Pending"}
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                bgcolor: selectedPR.first_approval?.decision === "Approved" ? "#dcfce7" : "#ede9fe",
                                color: selectedPR.first_approval?.decision === "Approved" ? "#15803d" : "#7c3aed",
                                fontWeight: 700,
                              }}
                            />
                          </Box>

                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: selectedPR.final_approval?.decision === "Approved" ? "#10b981" : "#94a3b8" }} />
                              <Typography sx={{ fontSize: "0.8rem", fontWeight: 650, color: "#1e293b" }}>4. Stage 5: GM Approval (Manu Pillai)</Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={selectedPR.final_approval?.decision || "Pending"}
                              sx={{
                                height: 20,
                                fontSize: "0.68rem",
                                bgcolor: selectedPR.final_approval?.decision === "Approved" ? "#dcfce7" : "#f1f5f9",
                                color: selectedPR.final_approval?.decision === "Approved" ? "#15803d" : "#64748b",
                                fontWeight: 700,
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── TAB 1: QUOTATIONS & IT EVALUATION ── */}
            {workflowTab === 1 && (
              <Box>
                {/* 3 Quotations Side-by-Side Matrix */}
                <Typography sx={{ fontSize: "1rem", fontWeight: 750, color: "#1e293b", mb: 1.5 }}>
                  Vendor Quotation Comparison Matrix (Minimum 3 Quotes)
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  {quotesList.map((q, qIdx) => {
                    const activeWinnerQuoteNo = gmForm.selected_quote_no || selectedPR?.final_approval?.selected_quote_no;
                    const isWinner = Boolean(activeWinnerQuoteNo && q.quotation_no === activeWinnerQuoteNo);
                    const activeRecommendedQuoteNo = itEvalForm.recommended_quote_no || selectedPR?.it_evaluation?.recommended_quote_no;
                    const isRecommended = Boolean(activeRecommendedQuoteNo && q.quotation_no === activeRecommendedQuoteNo);
                    const quoteLabel = `Quotation ${qIdx + 1}`;

                    return (
                      <Grid item xs={12} md={4} key={qIdx}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2.2,
                            borderRadius: "12px",
                            border: "2px solid",
                            borderColor: isWinner ? "#10b981" : isRecommended ? "#4f46e5" : "#e2e8f0",
                            bgcolor: isWinner ? "#f0fdf4" : isRecommended ? "#eef2ff" : "#fff",
                            position: "relative",
                            boxShadow: isWinner || isRecommended ? "0 4px 14px rgba(79, 70, 229, 0.08)" : "none",
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                            <Chip
                              size="small"
                              label={quoteLabel}
                              sx={{
                                fontWeight: 750,
                                fontSize: "0.78rem",
                                bgcolor: isWinner ? "#dcfce7" : isRecommended ? "#e0e7ff" : "#f1f5f9",
                                color: isWinner ? "#15803d" : isRecommended ? "#4338ca" : "#334155",
                              }}
                            />
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              {isWinner && <Chip size="small" label="GM Winner" color="success" sx={{ fontWeight: 700 }} />}
                              {isRecommended && !isWinner && <Chip size="small" label="IT Recommended" color="primary" sx={{ fontWeight: 700 }} />}
                            </Box>
                          </Box>

                          {/* 1. Field: Quotation X — Vendor * (Vendor name from Vendors & AMC Suppliers module) */}
                          <Box sx={{ mb: 2 }}>
                            <Autocomplete
                              freeSolo
                              size="small"
                              options={vendorList}
                              getOptionLabel={(option) => {
                                if (typeof option === "string") return option;
                                return option.name || option.vendor_name || "";
                              }}
                              isOptionEqualToValue={(option, val) => {
                                const valStr = typeof val === "string" ? val : val?.name || val?.vendor_name || "";
                                const optStr = option?.name || option?.vendor_name || "";
                                return optStr.trim().toLowerCase() === valStr.trim().toLowerCase();
                              }}
                              value={
                                vendorList.find(
                                  (v) => (v.name || "").trim().toLowerCase() === (q.vendor_name || "").trim().toLowerCase()
                                ) || q.vendor_name || ""
                              }
                              onChange={(_event, newValue) => {
                                const updated = [...quotesList];
                                if (typeof newValue === "string") {
                                  updated[qIdx].vendor_name = newValue;
                                  const match = vendorList.find(
                                    (v) => (v.name || "").trim().toLowerCase() === newValue.trim().toLowerCase()
                                  );
                                  if (match) updated[qIdx].vendor_id = match._id;
                                } else if (newValue && typeof newValue === "object") {
                                  updated[qIdx].vendor_name = newValue.name || newValue.vendor_name || "";
                                  updated[qIdx].vendor_id = newValue._id || null;
                                } else {
                                  updated[qIdx].vendor_name = "";
                                  updated[qIdx].vendor_id = null;
                                }
                                setQuotesList(updated);
                              }}
                              onInputChange={(_event, newInputValue, reason) => {
                                if (reason === "input") {
                                  const updated = [...quotesList];
                                  updated[qIdx].vendor_name = newInputValue;
                                  const match = vendorList.find(
                                    (v) => (v.name || "").trim().toLowerCase() === (newInputValue || "").trim().toLowerCase()
                                  );
                                  if (match) updated[qIdx].vendor_id = match._id;
                                  setQuotesList(updated);
                                }
                              }}
                              renderOption={(props, option) => (
                                <Box
                                  component="li"
                                  {...props}
                                  key={option._id || option.vendor_code || option.name}
                                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", py: 0.6 }}
                                >
                                  <Box>
                                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 650, color: "#1e293b" }}>
                                      {option.name}
                                    </Typography>
                                    {option.contact_person && (
                                      <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                                        Contact: {option.contact_person}
                                      </Typography>
                                    )}
                                  </Box>
                                  {option.vendor_code && (
                                    <Chip
                                      size="small"
                                      label={option.vendor_code}
                                      sx={{ fontSize: "0.68rem", height: 20, bgcolor: "#f1f5f9", color: "#475569", fontWeight: 600, ml: 1 }}
                                    />
                                  )}
                                </Box>
                              )}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label={`${quoteLabel} — Vendor *`}
                                  placeholder="Vendor name"
                                  helperText={
                                    vendorList.length > 0
                                      ? `Vendors & AMC Suppliers master (${vendorList.length} registered)`
                                      : "Vendors & AMC Suppliers"
                                  }
                                  FormHelperTextProps={{ sx: { fontSize: "0.68rem", mt: 0.25, color: "#64748b" } }}
                                />
                              )}
                            />
                          </Box>

                          {/* 2. Field: Quotation X — File */}
                          <Box sx={{ mb: 2, p: 1.5, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                                {`${quoteLabel} — File`}
                              </Typography>
                              {q.file_url ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Eye size={13} />}
                                  onClick={() => openDocViewer(q.file_url, `${quoteLabel} - ${q.vendor_name || "Quotation File"}`)}
                                  sx={{ textTransform: "none", fontSize: "0.72rem", py: 0.2, px: 0.9, height: 24 }}
                                >
                                  View
                                </Button>
                              ) : null}
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <input
                                id={`quote-file-input-${qIdx}`}
                                type="file"
                                style={{ display: "none" }}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(e.target.files[0], (url) => {
                                      const updated = [...quotesList];
                                      updated[qIdx].file_url = url;
                                      setQuotesList(updated);
                                    });
                                  }
                                }}
                              />
                              <label htmlFor={`quote-file-input-${qIdx}`} style={{ width: "100%" }}>
                                <Button
                                  fullWidth
                                  size="small"
                                  component="span"
                                  variant={q.file_url ? "outlined" : "contained"}
                                  startIcon={<UploadCloud size={14} />}
                                  sx={{
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    bgcolor: q.file_url ? "transparent" : "#4f46e5",
                                    color: q.file_url ? "#4f46e5" : "#fff",
                                    borderColor: "#4f46e5",
                                    "&:hover": {
                                      bgcolor: q.file_url ? "#eef2ff" : "#4338ca",
                                    },
                                  }}
                                >
                                  {q.file_url ? "Replace File" : "Choose File (PDF/Doc/Image)"}
                                </Button>
                              </label>
                            </Box>
                            {q.file_url && (
                              <Typography
                                noWrap
                                sx={{ fontSize: "0.7rem", color: "#16a34a", mt: 0.5, fontWeight: 600 }}
                              >
                                ✓ Attached: {q.file_url.split("/").pop() || "Quotation Document"}
                              </Typography>
                            )}
                          </Box>

                          {/* 3. Field: Quotation X — Total ₹ */}
                          <Box>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label={`${quoteLabel} — Total ₹`}
                              placeholder="e.g. 25000"
                              value={q.total_amount || ""}
                              onChange={(e) => {
                                const updated = [...quotesList];
                                updated[qIdx].total_amount = e.target.value;
                                setQuotesList(updated);
                              }}
                              InputProps={{
                                startAdornment: (
                                  <Typography sx={{ mr: 0.5, color: "#64748b", fontWeight: 700, fontSize: "0.85rem" }}>
                                    ₹
                                  </Typography>
                                ),
                              }}
                            />
                          </Box>

                          {/* Quick Recommend Button */}
                          {q.vendor_name && (
                            <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                              <Button
                                size="small"
                                variant={isRecommended ? "contained" : "outlined"}
                                onClick={() => handleSelectRecommendedQuote(q.quotation_no)}
                                startIcon={isRecommended ? <Check size={14} /> : <ShieldCheck size={14} />}
                                sx={{
                                  textTransform: "none",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  py: 0.3,
                                  bgcolor: isRecommended ? "#4f46e5" : "transparent",
                                  color: isRecommended ? "#fff" : "#4f46e5",
                                  borderColor: "#4f46e5",
                                  "&:hover": {
                                    bgcolor: isRecommended ? "#4338ca" : "#eef2ff",
                                  },
                                }}
                              >
                                {isRecommended ? "✓ Recommended by IT" : "Recommend Quote"}
                              </Button>
                            </Box>
                          )}
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
                  <Button
                    variant="contained"
                    onClick={handleSaveQuotations}
                    disabled={submitting}
                    startIcon={<Check size={16} />}
                    sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                  >
                    Save Quotations Matrix
                  </Button>
                </Box>

                {/* IT Technical Evaluation Card */}
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ShieldCheck size={20} color="#4f46e5" />
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                        Stage 3: IT Technical Evaluation &amp; Recommendation
                      </Typography>
                    </Box>
                    {isITUser && (
                      <Chip size="small" label="IT Role Authorized" color="primary" sx={{ fontWeight: 600, fontSize: "0.7rem" }} />
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Evaluation Decision *"
                        value={itEvalForm.decision}
                        onChange={(e) => setItEvalForm({ ...itEvalForm, decision: e.target.value })}
                      >
                        <MenuItem value="Approved">Approved (Feasible &amp; Recommended)</MenuItem>
                        <MenuItem value="Rejected">Rejected</MenuItem>
                        <MenuItem value="Clarification Required">Clarification Required</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Recommended Quote / Vendor *"
                        value={itEvalForm.recommended_quote_no}
                        onChange={(e) => handleSelectRecommendedQuote(e.target.value)}
                        helperText="Selecting automatically triggers API to save recommendation"
                        FormHelperTextProps={{ sx: { fontSize: "0.68rem", color: "#6366f1", fontWeight: 650 } }}
                      >
                        <MenuItem value="">None</MenuItem>
                        {quotesList
                          .filter((q) => q.vendor_name)
                          .map((q) => (
                            <MenuItem key={q.quotation_no} value={q.quotation_no}>
                              {q.quotation_no} — {q.vendor_name} (₹{q.total_amount})
                            </MenuItem>
                          ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Evaluated By"
                        value={selectedPR.it_evaluation?.evaluated_by || currentUser?.name || currentUser?.username || "IT Engineer"}
                        disabled
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                        label="Technical Evaluation Remarks"
                        placeholder="Detail spec compliance, warranty terms, reliability of vendor, on-site support..."
                        value={itEvalForm.remarks}
                        onChange={(e) => setItEvalForm({ ...itEvalForm, remarks: e.target.value })}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmitItEval}
                      disabled={submitting}
                      sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                    >
                      Submit Technical Evaluation
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}

            {/* ── TAB 2: APPROVALS (HOD & GM) ── */}
            {workflowTab === 2 && (
              <Box>
                {/* Quotation Comparison Preview for HOD & GM Approvers */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    mb: 3,
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FileSpreadsheet size={18} color="#4f46e5" />
                      <Typography sx={{ fontSize: "0.92rem", fontWeight: 750, color: "#1e293b" }}>
                        Evaluated Quotations for Approval (Minimum 3 Quotes)
                      </Typography>
                    </Box>
                    {selectedPR.it_evaluation?.recommended_vendor && (
                      <Chip
                        size="small"
                        label={`IT Recommended: ${selectedPR.it_evaluation.recommended_vendor}`}
                        sx={{ bgcolor: "#e0e7ff", color: "#4338ca", fontWeight: 700, fontSize: "0.75rem" }}
                      />
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    {quotesList.map((q, idx) => {
                      const activeWinnerQuoteNo = gmForm.selected_quote_no || selectedPR?.final_approval?.selected_quote_no;
                      const isWinner = Boolean(activeWinnerQuoteNo && q.quotation_no === activeWinnerQuoteNo);
                      const activeRecommendedQuoteNo = itEvalForm.recommended_quote_no || selectedPR?.it_evaluation?.recommended_quote_no;
                      const isRecommended = Boolean(activeRecommendedQuoteNo && q.quotation_no === activeRecommendedQuoteNo);

                      return (
                        <Grid item xs={12} sm={4} key={idx}>
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: "8px",
                              border: "1.5px solid",
                              borderColor: isWinner ? "#10b981" : isRecommended ? "#6366f1" : "#e2e8f0",
                              bgcolor: isWinner ? "#f0fdf4" : isRecommended ? "#eef2ff" : "#f8fafc",
                            }}
                          >
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                              <Typography sx={{ fontSize: "0.78rem", fontWeight: 750, color: "#334155" }}>
                                Quotation {idx + 1}
                              </Typography>
                              {isWinner ? (
                                <Chip size="small" label="Winner (GM)" color="success" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                              ) : isRecommended ? (
                                <Chip size="small" label="IT Pick" color="primary" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />
                              ) : null}
                            </Box>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a", mb: 0.5 }}>
                              {q.vendor_name || "—"}
                            </Typography>
                            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#059669" }}>
                              ₹{Number(q.total_amount || 0).toLocaleString("en-IN")}
                            </Typography>
                            <Box sx={{ mt: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              {q.file_url ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Eye size={12} />}
                                  onClick={() => openDocViewer(q.file_url, `Quotation ${idx + 1} - ${q.vendor_name || ""}`)}
                                  sx={{ textTransform: "none", fontSize: "0.72rem", height: 24, py: 0.2 }}
                                >
                                  View Quote File
                                </Button>
                              ) : (
                                <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>No file</Typography>
                              )}
                              {showStage5 && !isWinner && q.vendor_name && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => {
                                    setGmForm({
                                      ...gmForm,
                                      selected_quote_no: q.quotation_no,
                                      selected_vendor: q.vendor_name,
                                      final_approved_amount: q.total_amount || gmForm.final_approved_amount,
                                    });
                                  }}
                                  sx={{ textTransform: "none", fontSize: "0.7rem", height: 24, py: 0.2, bgcolor: "#059669", "&:hover": { bgcolor: "#047857" } }}
                                >
                                  Select as Winner
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>

                  {selectedPR.it_evaluation?.remarks && (
                    <Box sx={{ mt: 1.5, p: 1.2, borderRadius: "6px", bgcolor: "#f1f5f9", fontSize: "0.78rem", color: "#475569" }}>
                      <b>IT Recommendation Remarks:</b> {selectedPR.it_evaluation.remarks}
                    </Box>
                  )}
                </Paper>

                <Grid container spacing={3}>
                  {/* Tier 1: HOD / Admin Approval (Shalini Arun) */}
                  <Grid item xs={12} md={showStage5 ? 6 : 12}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: selectedPR.first_approval?.decision === "Approved" ? "#10b981" : "#e2e8f0",
                        bgcolor: "#fff",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircle2 size={20} color="#4f46e5" />
                          <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                            Stage 4: HOD / Admin Approval
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={selectedPR.first_approval?.decision || "Pending"}
                          color={selectedPR.first_approval?.decision === "Approved" ? "success" : "default"}
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>

                      <Typography sx={{ fontSize: "0.8rem", color: "#64748b", mb: 2 }}>
                        Designated Approver: <b>Shalini Arun</b> (or Administrator)
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Decision *"
                            disabled={!isShaliniArun}
                            value={hodForm.decision}
                            onChange={(e) => setHodForm({ ...hodForm, decision: e.target.value })}
                          >
                            <MenuItem value="Approved">Approved</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                            <MenuItem value="Returned">Returned for Clarification</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Approved Amount (₹) *"
                            disabled={!isShaliniArun}
                            value={hodForm.approved_amount}
                            onChange={(e) => setHodForm({ ...hodForm, approved_amount: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            label="HOD Remarks"
                            placeholder="Add approval remarks or conditions..."
                            disabled={!isShaliniArun}
                            value={hodForm.remarks}
                            onChange={(e) => setHodForm({ ...hodForm, remarks: e.target.value })}
                          />
                        </Grid>
                      </Grid>

                      {isShaliniArun ? (
                        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            variant="contained"
                            onClick={handleSubmitHodApproval}
                            disabled={submitting}
                            sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                          >
                            Submit HOD Decision
                          </Button>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 1.5, fontStyle: "italic" }}>
                          * Only Shalini Arun or Administrators have permission to approve Stage 4.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  {/* Tier 2: GM Approval & Winner Quote Selection (Manu Pillai) - ONLY shown to General Manager */}
                  {showStage5 && (
                    <Grid item xs={12} md={6}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: selectedPR.final_approval?.decision === "Approved" ? "#10b981" : "#e2e8f0",
                          bgcolor: "#fff",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <ShieldCheck size={20} color="#059669" />
                            <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                              Stage 5: General Manager Approval
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={selectedPR.final_approval?.decision || "Pending"}
                            color={selectedPR.final_approval?.decision === "Approved" ? "success" : "default"}
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>

                        <Typography sx={{ fontSize: "0.8rem", color: "#64748b", mb: 2 }}>
                          Final Management Approver: <b>Manu Pillai</b> (or Administrator)
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="GM Decision *"
                              disabled={!isManuPillai}
                              value={gmForm.decision}
                              onChange={(e) => setGmForm({ ...gmForm, decision: e.target.value })}
                            >
                              <MenuItem value="Approved">Approved</MenuItem>
                              <MenuItem value="Rejected">Rejected</MenuItem>
                              <MenuItem value="Returned">Returned</MenuItem>
                            </TextField>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              label="Selected Winner Vendor *"
                              disabled={!isManuPillai}
                              value={gmForm.selected_quote_no}
                              onChange={(e) => {
                                const qNo = e.target.value;
                                const found = quotesList.find((q) => q.quotation_no === qNo);
                                setGmForm({
                                  ...gmForm,
                                  selected_quote_no: qNo,
                                  selected_vendor: found?.vendor_name || "",
                                  final_approved_amount: found?.total_amount || gmForm.final_approved_amount,
                                });
                              }}
                            >
                              {quotesList
                                .filter((q) => q.vendor_name)
                                .map((q) => (
                                  <MenuItem key={q.quotation_no} value={q.quotation_no}>
                                    {q.vendor_name} (₹{q.total_amount})
                                  </MenuItem>
                                ))}
                            </TextField>
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Final Approved ₹ *"
                              disabled={!isManuPillai}
                              value={gmForm.final_approved_amount}
                              onChange={(e) => setGmForm({ ...gmForm, final_approved_amount: e.target.value })}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Approver Name"
                              value={selectedPR.final_approval?.approver_name || "Manu Pillai"}
                              disabled
                            />
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              rows={2}
                              size="small"
                              label="Management Remarks"
                              placeholder="Why this vendor was chosen, negotiated pricing terms..."
                              disabled={!isManuPillai}
                              value={gmForm.remarks}
                              onChange={(e) => setGmForm({ ...gmForm, remarks: e.target.value })}
                            />
                          </Grid>
                        </Grid>

                        {isManuPillai ? (
                          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              variant="contained"
                              onClick={handleSubmitGmApproval}
                              disabled={submitting}
                              sx={{ bgcolor: "#059669", textTransform: "none", fontWeight: 650, "&:hover": { bgcolor: "#047857" } }}
                            >
                              Confirm GM Selection &amp; Approve
                            </Button>
                          </Box>
                        ) : (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", mt: 1.5, fontStyle: "italic" }}>
                            * Only Manu Pillai or Administrators have permission to approve Stage 5.
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* ── TAB 3: PO & GRN RECEIVING ── */}
            {workflowTab === 3 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Purchase Order (PO) */}
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Receipt size={20} color="#4f46e5" />
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                          Stage 6: Purchase Order (PO) Generation
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="PO Number *"
                            value={poForm.po_number}
                            onChange={(e) => setPoForm({ ...poForm, po_number: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="PO Date"
                            InputLabelProps={{ shrink: true }}
                            value={poForm.po_date}
                            onChange={(e) => setPoForm({ ...poForm, po_date: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="PO Amount ₹"
                            value={poForm.po_amount}
                            onChange={(e) => setPoForm({ ...poForm, po_amount: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Expected Delivery"
                            InputLabelProps={{ shrink: true }}
                            value={poForm.expected_delivery}
                            onChange={(e) => setPoForm({ ...poForm, expected_delivery: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                            {poForm.po_file_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={14} />}
                                onClick={() => openDocViewer(poForm.po_file_url, "Purchase Order Document")}
                                sx={{ textTransform: "none" }}
                              >
                                View PO Document
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>No PO attached</Typography>
                            )}
                            <label>
                              <input
                                type="file"
                                hidden
                                accept=".pdf,.docx,.doc,.jpg,.png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(e.target.files[0], (url) => setPoForm({ ...poForm, po_file_url: url }));
                                  }
                                }}
                              />
                              <Button size="small" component="span" startIcon={<UploadCloud size={14} />} sx={{ textTransform: "none" }}>
                                {poForm.po_file_url ? "Replace PO" : "Upload PO Document"}
                              </Button>
                            </label>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          onClick={handleSubmitPO}
                          disabled={submitting}
                          sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                        >
                          Save &amp; Issue Purchase Order
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Physical Receiving & GRN */}
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Truck size={20} color="#059669" />
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                          Stage 7: Receiving &amp; GRN Inspection
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="GRN Number"
                            value={grnForm.grn_number}
                            onChange={(e) => setGrnForm({ ...grnForm, grn_number: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Received Date"
                            InputLabelProps={{ shrink: true }}
                            value={grnForm.received_date}
                            onChange={(e) => setGrnForm({ ...grnForm, received_date: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Received Quantity"
                            value={grnForm.received_qty}
                            onChange={(e) => setGrnForm({ ...grnForm, received_qty: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Inspection Status"
                            value={grnForm.inspection_status}
                            onChange={(e) => setGrnForm({ ...grnForm, inspection_status: e.target.value })}
                          >
                            <MenuItem value="Accepted">Accepted (Pass)</MenuItem>
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Rejected">Rejected</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Serial Numbers (Comma separated) *"
                            placeholder="e.g. SN-998811, SN-998812"
                            value={grnForm.serial_numbers_text}
                            onChange={(e) => setGrnForm({ ...grnForm, serial_numbers_text: e.target.value })}
                            helperText="Crucial for automatic asset registration in Unified Hub"
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                            {grnForm.delivery_challan_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={14} />}
                                onClick={() => openDocViewer(grnForm.delivery_challan_url, "Delivery Challan")}
                                sx={{ textTransform: "none" }}
                              >
                                View Delivery Challan
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>No challan attached</Typography>
                            )}
                            <label>
                              <input
                                type="file"
                                hidden
                                accept=".pdf,.docx,.doc,.jpg,.png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(e.target.files[0], (url) => setGrnForm({ ...grnForm, delivery_challan_url: url }));
                                  }
                                }}
                              />
                              <Button size="small" component="span" startIcon={<UploadCloud size={14} />} sx={{ textTransform: "none" }}>
                                {grnForm.delivery_challan_url ? "Replace Challan" : "Upload Challan"}
                              </Button>
                            </label>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          onClick={handleSubmitGRN}
                          disabled={submitting}
                          sx={{ bgcolor: "#059669", textTransform: "none", fontWeight: 650, "&:hover": { bgcolor: "#047857" } }}
                        >
                          Record Goods Receipt (GRN)
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── TAB 4: TAX INVOICE & ACCOUNTS 3-WAY MATCHING ── */}
            {workflowTab === 4 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <FileCheck size={20} color="#4f46e5" />
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                          Stage 8 &amp; 9: Tax Invoice Details &amp; Accounts Verification
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        {/* 1. Vendor Name from Vendor Management module */}
                        <Grid item xs={12} sm={6}>
                          <Autocomplete
                            freeSolo
                            size="small"
                            options={vendorList}
                            getOptionLabel={(option) => {
                              if (typeof option === "string") return option;
                              return option.name || option.vendor_name || "";
                            }}
                            isOptionEqualToValue={(option, val) => {
                              const valStr = typeof val === "string" ? val : val?.name || val?.vendor_name || "";
                              const optStr = option?.name || option?.vendor_name || "";
                              return optStr.trim().toLowerCase() === valStr.trim().toLowerCase();
                            }}
                            value={
                              vendorList.find(
                                (v) => (v.name || "").trim().toLowerCase() === (invoiceForm.vendor_name || "").trim().toLowerCase()
                              ) || invoiceForm.vendor_name || ""
                            }
                            onChange={(_event, newValue) => {
                              const vName = typeof newValue === "string" ? newValue : newValue?.name || newValue?.vendor_name || "";
                              const matched = vendorList.find(
                                (v) => (v.name || "").trim().toLowerCase() === vName.trim().toLowerCase()
                              );
                              setInvoiceForm((prev) => ({
                                ...prev,
                                vendor_name: vName,
                                vendor_id: matched?._id || null,
                                gstin: matched?.gst_number || prev.gstin,
                              }));
                            }}
                            onInputChange={(_event, newInputValue, reason) => {
                              if (reason === "input") {
                                const matched = vendorList.find(
                                  (v) => (v.name || "").trim().toLowerCase() === (newInputValue || "").trim().toLowerCase()
                                );
                                setInvoiceForm((prev) => ({
                                  ...prev,
                                  vendor_name: newInputValue,
                                  vendor_id: matched?._id || null,
                                  gstin: matched?.gst_number || prev.gstin,
                                }));
                              }
                            }}
                            renderOption={(props, option) => (
                              <Box
                                component="li"
                                {...props}
                                key={option._id || option.vendor_code || option.name}
                                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", py: 0.6 }}
                              >
                                <Box>
                                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 650, color: "#1e293b" }}>
                                    {option.name}
                                  </Typography>
                                  {option.gst_number && (
                                    <Typography sx={{ fontSize: "0.7rem", color: "#64748b" }}>
                                      GST: {option.gst_number}
                                    </Typography>
                                  )}
                                </Box>
                                {option.vendor_code && (
                                  <Chip
                                    size="small"
                                    label={option.vendor_code}
                                    sx={{ fontSize: "0.68rem", height: 20, bgcolor: "#f1f5f9", color: "#475569", fontWeight: 600, ml: 1 }}
                                  />
                                )}
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Vendor Name (Vendor Management) *"
                                placeholder="Select or enter vendor"
                                helperText={
                                  invoiceForm.vendor_name
                                    ? `Linked to Vendors & AMC Suppliers master`
                                    : "Choose from Vendors & AMC Suppliers"
                                }
                                FormHelperTextProps={{ sx: { fontSize: "0.68rem", mt: 0.25, color: "#64748b" } }}
                              />
                            )}
                          />
                        </Grid>

                        {/* 2. Vendor GSTIN auto-populated from Vendor Management */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Vendor GSTIN"
                            placeholder="e.g. 24AAECB4165A1Z9"
                            value={invoiceForm.gstin}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, gstin: e.target.value.toUpperCase() })}
                            helperText={
                              (() => {
                                const matched = vendorList.find(
                                  (v) =>
                                    (v.name || "").trim().toLowerCase() === (invoiceForm.vendor_name || "").trim().toLowerCase() ||
                                    (v.gst_number && v.gst_number.toUpperCase() === (invoiceForm.gstin || "").toUpperCase())
                                );
                                if (matched?.gst_number && matched.gst_number.toUpperCase() === (invoiceForm.gstin || "").toUpperCase()) {
                                  return `✓ Sourced from Vendor Management (${matched.vendor_code || matched.name})`;
                                }
                                return "Auto-populated from Vendor Management module";
                              })()
                            }
                            FormHelperTextProps={{
                              sx: {
                                fontSize: "0.68rem",
                                mt: 0.25,
                                color: invoiceForm.gstin ? "#16a34a" : "#64748b",
                                fontWeight: invoiceForm.gstin ? 650 : 400,
                              },
                            }}
                            InputProps={{
                              endAdornment: invoiceForm.gstin ? (
                                <InputAdornment position="end">
                                  <Chip
                                    size="small"
                                    label="GST Verified"
                                    color="success"
                                    sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                                  />
                                </InputAdornment>
                              ) : null,
                            }}
                          />
                        </Grid>

                        {/* 3. Tax Invoice Number */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Tax Invoice Number *"
                            value={invoiceForm.invoice_number}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_number: e.target.value })}
                          />
                        </Grid>

                        {/* 4. Invoice Date */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Invoice Date"
                            InputLabelProps={{ shrink: true }}
                            value={invoiceForm.invoice_date}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                          />
                        </Grid>

                        {/* 5. Total Invoice Amount */}
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Total Invoice Amount ₹ *"
                            value={invoiceForm.invoice_amount}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_amount: e.target.value })}
                            helperText={
                              selectedPR.purchase_order?.po_amount
                                ? `PO Amount: ₹${Number(selectedPR.purchase_order.po_amount).toLocaleString("en-IN")}`
                                : ""
                            }
                            FormHelperTextProps={{ sx: { fontSize: "0.7rem", color: "#4f46e5", fontWeight: 600 } }}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                            {invoiceForm.invoice_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={14} />}
                                onClick={() => openDocViewer(invoiceForm.invoice_url, "Tax Invoice PDF")}
                                sx={{ textTransform: "none" }}
                              >
                                View Tax Invoice PDF
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>No invoice file attached</Typography>
                            )}
                            <label>
                              <input
                                type="file"
                                hidden
                                accept=".pdf,.docx,.doc,.jpg,.png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(e.target.files[0], (url) => setInvoiceForm({ ...invoiceForm, invoice_url: url }));
                                  }
                                }}
                              />
                              <Button size="small" component="span" startIcon={<UploadCloud size={14} />} sx={{ textTransform: "none" }}>
                                {invoiceForm.invoice_url ? "Replace Invoice" : "Upload Tax Invoice"}
                              </Button>
                            </label>
                          </Box>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            label="Accounts Verification Remarks"
                            placeholder="Confirmation of PO, invoice, and receiving quantities matching..."
                            value={invoiceForm.accounts_remarks}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, accounts_remarks: e.target.value })}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        {!isAccountsUser && (
                          <Typography sx={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic" }}>
                            * Sign-off is typically restricted to Accounts Department or Administrators.
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          onClick={handleSubmitInvoiceVerify}
                          disabled={submitting}
                          sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650, ml: "auto" }}
                        >
                          Sign-off Accounts 3-Way Match
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* 3-Way Matching Summary Panel */}
                  <Grid item xs={12} md={5}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                      <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b", mb: 2 }}>
                        Accounts 3-Way Matching Engine
                      </Typography>

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>1. Purchase Order Amount</Typography>
                          <Typography sx={{ fontWeight: 750, color: "#0f172a" }}>
                            ₹{(selectedPR.purchase_order?.po_amount || 0).toLocaleString("en-IN")}
                          </Typography>
                        </Box>

                        <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>2. Goods Received Quantity</Typography>
                          <Typography sx={{ fontWeight: 750, color: "#0f172a" }}>
                            {selectedPR.grn_receiving?.received_qty || 0} Units received (Inspection: {selectedPR.grn_receiving?.inspection_status || "Pending"})
                          </Typography>
                        </Box>

                        <Box sx={{ p: 1.5, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>3. Tax Invoice Amount</Typography>
                          <Typography sx={{ fontWeight: 750, color: "#0f172a" }}>
                            ₹{(parseFloat(invoiceForm.invoice_amount) || 0).toLocaleString("en-IN")}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            p: 2,
                            borderRadius: "8px",
                            bgcolor:
                              Math.abs((selectedPR.purchase_order?.po_amount || 0) - (parseFloat(invoiceForm.invoice_amount) || 0)) < 1
                                ? "#ecfdf5"
                                : "#fffbeb",
                            border: "1px solid",
                            borderColor:
                              Math.abs((selectedPR.purchase_order?.po_amount || 0) - (parseFloat(invoiceForm.invoice_amount) || 0)) < 1
                                ? "#10b981"
                                : "#f59e0b",
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>
                            Matching Check Result:
                          </Typography>
                          <Typography sx={{ fontSize: "0.8rem", color: "#475569", mt: 0.5 }}>
                            {Math.abs((selectedPR.purchase_order?.po_amount || 0) - (parseFloat(invoiceForm.invoice_amount) || 0)) < 1
                              ? "✓ Commercials match: PO Amount == Tax Invoice Amount. Verified for payment processing."
                              : "⚠ Discrepancy detected: PO Amount and Invoice Amount do not match. Please verify taxes or revisions."}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── TAB 5: PAYMENT & AUTOMATED ASSET BRIDGE ── */}
            {workflowTab === 5 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Payment Recording */}
                  <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <CreditCard size={20} color="#4f46e5" />
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                          Stage 10: Payment &amp; UTR Reference
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Payment Status *"
                            value={paymentForm.payment_status}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}
                          >
                            <MenuItem value="Processed">Processed (Completed)</MenuItem>
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Hold">Hold</MenuItem>
                            <MenuItem value="Failed">Failed</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Payment Mode *"
                            value={paymentForm.payment_mode}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                          >
                            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                            <MenuItem value="NEFT">NEFT</MenuItem>
                            <MenuItem value="RTGS">RTGS</MenuItem>
                            <MenuItem value="IMPS">IMPS</MenuItem>
                            <MenuItem value="Cheque">Cheque</MenuItem>
                            <MenuItem value="UPI">UPI</MenuItem>
                            <MenuItem value="Card">Card</MenuItem>
                          </TextField>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Paid Amount ₹ *"
                            value={paymentForm.paid_amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Payment Date *"
                            InputLabelProps={{ shrink: true }}
                            value={paymentForm.payment_date}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="UTR / Transaction Reference *"
                            placeholder="e.g. HDFCR202610170099881"
                            value={paymentForm.utr_number}
                            onChange={(e) => setPaymentForm({ ...paymentForm, utr_number: e.target.value })}
                          />
                        </Grid>

                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                            {paymentForm.payment_proof_url ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={14} />}
                                onClick={() => openDocViewer(paymentForm.payment_proof_url, "Payment UTR Proof")}
                                sx={{ textTransform: "none" }}
                              >
                                View Payment Proof
                              </Button>
                            ) : (
                              <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>No payment proof attached</Typography>
                            )}
                            <label>
                              <input
                                type="file"
                                hidden
                                accept=".pdf,.docx,.doc,.jpg,.png"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleUploadDoc(e.target.files[0], (url) => setPaymentForm({ ...paymentForm, payment_proof_url: url }));
                                  }
                                }}
                              />
                              <Button size="small" component="span" startIcon={<UploadCloud size={14} />} sx={{ textTransform: "none" }}>
                                {paymentForm.payment_proof_url ? "Replace Proof" : "Upload UTR Proof"}
                              </Button>
                            </label>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2.5, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="contained"
                          onClick={handleSubmitPayment}
                          disabled={submitting}
                          sx={{ bgcolor: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                        >
                          Record Payment Details
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Automated Asset Bridge (Stage 11) */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: "10px",
                        border: "2px solid",
                        borderColor: selectedPR.asset_bridge?.is_registered ? "#10b981" : "#4f46e5",
                        bgcolor: selectedPR.asset_bridge?.is_registered ? "#f0fdf4" : "#fff",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Boxes size={22} color={selectedPR.asset_bridge?.is_registered ? "#10b981" : "#4f46e5"} />
                        <Box>
                          <Typography sx={{ fontSize: "0.95rem", fontWeight: 750, color: "#1e293b" }}>
                            Stage 11: Automated Bridge to Unified Asset Hub
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                            Auto-register into ITAM inventory with zero manual duplicate data entry
                          </Typography>
                        </Box>
                      </Box>

                      {selectedPR.asset_bridge?.is_registered ? (
                        <Box sx={{ p: 2, bgcolor: "#ecfdf5", borderRadius: "8px", border: "1px solid #10b981", mb: 2 }}>
                          <Typography sx={{ fontWeight: 750, color: "#065f46", fontSize: "0.9rem" }}>
                            ✓ Equipment Successfully Registered in Unified Hub!
                          </Typography>
                          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Chip
                              label={selectedPR.asset_bridge.asset_tag}
                              color="success"
                              sx={{ fontWeight: 800, fontFamily: "monospace", fontSize: "0.85rem" }}
                            />
                            <Typography sx={{ fontSize: "0.75rem", color: "#047857" }}>
                              Registered on {new Date(selectedPR.asset_bridge.registered_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 2 }}>
                            <Button
                              component={Link}
                              to={`/it-helpdesk/unified-assets?search=${selectedPR.asset_bridge.asset_tag}`}
                              variant="contained"
                              size="small"
                              endIcon={<ExternalLink size={14} />}
                              sx={{ bgcolor: "#059669", textTransform: "none", fontWeight: 650, "&:hover": { bgcolor: "#047857" } }}
                            >
                              Open in Unified Asset Inventory
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", mb: 2 }}>
                            <Typography sx={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                              Commercial procurement is complete. Clicking the button below will immediately create an official IT asset tag (e.g. <b>AST-2026-XXX</b>), copy serial numbers, link invoice and warranty dates, and populate into <b>UnifiedAssetInventory.jsx</b>.
                            </Typography>
                          </Box>

                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleRegisterToUnifiedHub}
                            disabled={submitting}
                            startIcon={<Boxes size={20} />}
                            sx={{
                              bgcolor: "#4f46e5",
                              py: 1.5,
                              textTransform: "none",
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
                              "&:hover": { bgcolor: "#4338ca" },
                            }}
                          >
                            {submitting ? <CircularProgress size={22} color="inherit" /> : "⚡ Register Equipment to Unified Hub"}
                          </Button>
                        </Box>
                      )}

                      {/* Stage 12: Handover form */}
                      <Divider sx={{ my: 2 }} />
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 750, color: "#1e293b", mb: 1.5 }}>
                        Stage 12: Assignment &amp; Handover
                      </Typography>

                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Assign To Employee"
                            value={handoverForm.assigned_to_name}
                            onChange={(e) => setHandoverForm({ ...handoverForm, assigned_to_name: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Department"
                            value={handoverForm.department}
                            onChange={(e) => setHandoverForm({ ...handoverForm, department: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Branch / Location"
                            value={handoverForm.location}
                            onChange={(e) => setHandoverForm({ ...handoverForm, location: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="date"
                            label="Handover Date"
                            InputLabelProps={{ shrink: true }}
                            value={handoverForm.handover_date}
                            onChange={(e) => setHandoverForm({ ...handoverForm, handover_date: e.target.value })}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleSubmitHandover}
                          disabled={submitting}
                          sx={{ borderColor: "#4f46e5", color: "#4f46e5", textTransform: "none", fontWeight: 650 }}
                        >
                          Complete Handover
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── TAB 6: WORKFLOW AUDIT TRAIL ── */}
            {workflowTab === 6 && (
              <Box>
                <Typography sx={{ fontSize: "1rem", fontWeight: 750, color: "#1e293b", mb: 2 }}>
                  Immutable Procurement Audit Trail &amp; History
                </Typography>

                <Paper elevation={0} sx={{ p: 2.5, borderRadius: "10px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
                  <Box sx={{ position: "relative", pl: 3, borderLeft: "2px solid #e2e8f0" }}>
                    {(selectedPR.workflow_history || []).map((ev, idx) => (
                      <Box key={idx} sx={{ position: "relative", mb: 3 }}>
                        <Box
                          sx={{
                            position: "absolute",
                            left: -31,
                            top: 0,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            bgcolor: "#4f46e5",
                            border: "3px solid #fff",
                            boxShadow: "0 0 0 1px #cbd5e1",
                          }}
                        />
                        <Typography sx={{ fontWeight: 750, color: "#1e293b", fontSize: "0.85rem" }}>
                          {ev.action}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
                          By <b>{ev.performed_by || "System"}</b> ({ev.role || "User"}) • {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ""}
                        </Typography>
                        {ev.remarks && (
                          <Typography sx={{ fontSize: "0.8rem", color: "#334155", mt: 0.5, bgcolor: "#f8fafc", p: 1, borderRadius: "6px" }}>
                            {ev.remarks}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── 8. IN-APP DOCUMENT PREVIEW MODAL ── */}
      <Dialog
        open={Boolean(docViewerUrl)}
        onClose={() => setDocViewerUrl(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: "14px", height: "80vh" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", p: 2 }}>
          <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
            {docViewerTitle || "Procurement Document"}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Download size={14} />}
              onClick={() => {
                if (docViewerUrl) window.open(docViewerUrl, "_blank");
              }}
              sx={{ textTransform: "none" }}
            >
              Download
            </Button>
            <IconButton size="small" onClick={() => setDocViewerUrl(null)}>
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: "#1e293b", display: "grid", placeItems: "center" }}>
          {docViewerUrl?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
            <img src={docViewerUrl} alt="Document" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <iframe
              src={docViewerUrl}
              title="Document Preview"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Master Datalist for Auto-suggestions */}
      <datalist id="procurement-vendor-list">
        {vendorList.map((v) => (
          <option key={v._id || v.name} value={v.name} />
        ))}
      </datalist>
    </Box>
  );
}
