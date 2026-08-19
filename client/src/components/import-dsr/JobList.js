import React, {
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/job-list.scss";
import useJobColumns from "../../customHooks/useJobColumns";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewHeadlineIcon from "@mui/icons-material/ViewHeadline";
import {
  getTableRowsClassname,
  getTableRowInlineStyle,
} from "../../utils/getTableRowsClassname";
import useFetchJobList from "../../customHooks/useFetchJobList";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";
import { UserContext } from "../../contexts/UserContext";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  Snackbar,
  Alert,
  Autocomplete,
  Box,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import { MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { Dialog, DialogContent, DialogTitle, Button, Tooltip, DialogActions, Chip, CircularProgress } from "@mui/material";
import MyDocRequests from "../document-collection/MyDocRequests";
import DownloadIcon from "@mui/icons-material/Download";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SelectImporterModal from "./SelectImporterModal";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { YearContext } from "../../contexts/yearContext.js";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { BranchContext } from "../../contexts/BranchContext.js";
import useDynamicICDs from "../../customHooks/useDynamicICDs";

// Subcomponent for Raise Query Dialog to isolate text input state and eliminate typing lag
const RaiseQueryDialogContent = React.memo(({
  job,
  onSubmit,
  onClose,
  sending,
  uploadingAttachment,
  attachments,
  onFileUpload,
  onDeleteAttachment,
  fileInputRef
}) => {
  const [msg, setMsg] = useState("");

  return (
    <>
      <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid #e2e8f0", py: 2 }}>
        Raise Query for Job {job?.job_no}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Message"
          placeholder="Write detailed message to client..."
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          sx={{ mt: 1 }}
        />

        {attachments && attachments.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
            {attachments.map((att, idx) => (
              <Chip
                key={idx}
                size="small"
                label={att.fileName}
                onDelete={() => onDeleteAttachment(idx)}
                color="primary"
                variant="outlined"
              />
            ))}
          </div>
        )}

        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={onFileUpload}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAttachment}
            sx={{ textTransform: "none", fontSize: "12px" }}
          >
            {uploadingAttachment ? "Uploading..." : "Attach Document"}
          </Button>
        </div>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
        <Button onClick={onClose} sx={{ textTransform: "none", fontSize: "12px" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onSubmit(msg)}
          disabled={sending || (!msg.trim() && attachments.length === 0)}
          sx={{ textTransform: "none", fontSize: "12px", bgcolor: "#2563eb" }}
        >
          {sending ? "Submitting..." : "Submit Query"}
        </Button>
      </DialogActions>
    </>
  );
});

// Subcomponent for Chat Reply Input to isolate text input state and eliminate typing lag
const ChatReplyInputSection = React.memo(({
  onSendReply,
  sending,
  uploadingAttachment,
  attachments,
  onFileUpload,
  onDeleteAttachment,
  fileInputRef,
  activeQueryId
}) => {
  const [replyText, setReplyText] = useState("");

  const handleSend = () => {
    if (!replyText.trim() && attachments.length === 0) return;
    onSendReply(activeQueryId, replyText, () => setReplyText(""));
  };

  return (
    <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #cbd5e1" }}>
      {attachments.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
          {attachments.map((att, idx) => (
            <Chip
              key={idx}
              size="small"
              label={att.fileName}
              onDelete={() => onDeleteAttachment(idx)}
              color="primary"
              variant="outlined"
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={onFileUpload}
        />
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAttachment}
          title="Attach file"
          sx={{ color: "#475569" }}
        >
          {uploadingAttachment ? <CircularProgress size={18} /> : <AttachFileIcon style={{ fontSize: 20 }} />}
        </IconButton>

        <TextField
          fullWidth
          size="small"
          placeholder="Type your reply to client..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !sending) {
              handleSend();
            }
          }}
          sx={{ bgcolor: "#fff", borderRadius: "20px", "& .MuiOutlinedInput-root": { borderRadius: "20px" } }}
        />

        <IconButton
          onClick={handleSend}
          disabled={sending || (!replyText.trim() && attachments.length === 0)}
          sx={{ bgcolor: "#2563eb", color: "#fff", "&:hover": { bgcolor: "#1d4ed8" }, p: 1 }}
        >
          {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon style={{ fontSize: 18 }} />}
        </IconButton>
      </div>
    </div>
  );
});

const extractJobNo = (input) => {
  if (!input) return "";
  const s =
    typeof input === "string"
      ? input
      : String(input.label || input.value || "");
  const first = s.split("—")[0].split("-")[0].trim();
  const digits = first.replace(/[^\d]/g, "");
  return digits || first;
};

function JobList(props) {
  const showUnresolvedOnly = props.showUnresolvedOnly;
  const { onUnresolvedCountChange } = props;

  const [years, setYears] = useState([]);
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { user } = useContext(UserContext);

  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const dynamicICDs = useDynamicICDs();
  const {
    searchQuery,
    setSearchQuery,
    detailedStatus,
    setDetailedStatus,
    selectedICD,
    setSelectedICD,
    selectedImporter,
    setSelectedImporter,
    selectedBeType,
    setSelectedBeType,
    selectedMode,
    setSelectedMode,
  } = useSearchQuery();

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [importers, setImporters] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // View Mode: 'full' (Current UI) vs 'shrink' (Compact List with Latest Date in Seq)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("exim_joblist_view_mode") || "full";
    } catch (e) {
      return "full";
    }
  });

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("exim_joblist_view_mode", mode);
    } catch (e) {}
  }, []);

  // Query Management States
  const [clientQueriesStatus, setClientQueriesStatus] = useState({});
  const [queryChatOpen, setQueryChatOpen] = useState(false);
  const [queryChatJob, setQueryChatJob] = useState(null);
  const [queryChatData, setQueryChatData] = useState([]);
  const [queryChatLoading, setQueryChatLoading] = useState(false);
  const [queryChatReply, setQueryChatReply] = useState("");
  const [queryChatSending, setQueryChatSending] = useState(false);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [chatAttachments, setChatAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // For raising a query:
  const [raiseQueryOpen, setRaiseQueryOpen] = useState(false);
  const [raiseQueryJob, setRaiseQueryJob] = useState(null);
  const [raiseQueryMessage, setRaiseQueryMessage] = useState("");
  const [raiseQuerySending, setRaiseQuerySending] = useState(false);
  const [raiseQueryAttachments, setRaiseQueryAttachments] = useState([]);

  // Snackbar state for queries
  const [querySnackbar, setQuerySnackbar] = useState({ open: false, message: "", severity: "info" });

  const fileInputRef = React.useRef(null);
  const raiseFileInputRef = React.useRef(null);
  const chatEndRef = React.useRef(null);

  // Fetch query status for loaded jobs
  const fetchQueryStatusForJobs = useCallback(async (jobNos = []) => {
    if (!Array.isArray(jobNos) || jobNos.length === 0) return;
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const res = await axios.post(`${apiString}/client-queries/jobs-status`, {
        jobNos,
        isClient: false,
      });
      if (res.data?.success) {
        setClientQueriesStatus((prev) => ({
          ...prev,
          ...res.data.data,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch client queries status:", err);
    }
  }, []);

  const [open, setOpen] = useState(false);
  const [myRequestsOpen, setMyRequestsOpen] = useState(false); // Added state for MyDocRequests dialog
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [localInput, setLocalInput] = useState(searchQuery);

  // Clear state unless returning from details
  useEffect(() => {
    if (!(location.state && location.state.fromJobDetails)) {
      setSearchQuery("");
      setDetailedStatus("all");
      setSelectedICD("all");
      setSelectedICD("all");
      setSelectedImporter("");
      setSelectedBeType("all");
      setLocalInput("");
    }
    if (location.state && location.state.fromJobDetails) {
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line
  }, []);

  // Importer list
  useEffect(() => {
    async function getImporterList() {
      if (!selectedYearState) return;
      const params = new URLSearchParams();
      if (detailedStatus && detailedStatus !== "all") {
        params.append("detailedStatus", detailedStatus);
      }
      if (selectedBranch) {
        params.append("branchId", selectedBranch);
      }
      if (selectedCategory) {
        params.append("category", selectedCategory);
      }
      const queryString = params.toString();
      const url = `${process.env.REACT_APP_API_STRING
        }/get-importer-list/${selectedYearState}${queryString ? "?" + queryString : ""
        }`;
      const res = await axios.get(url);

      let fetchedImporters = res.data;

      // Filter based on assigned importers if not Admin
      if (user && user.role !== 'Admin') {
        const assignedImporters = user.assigned_importer_name || [];
        fetchedImporters = fetchedImporters.filter(item =>
          assignedImporters.includes(item.importer)
        );
      }

      setImporters(fetchedImporters);
    }
    getImporterList();
  }, [selectedYearState, detailedStatus, user, selectedBranch, selectedCategory]);

  const getUniqueImporterNames = useCallback((importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const seen = new Set();
    return importerData
      .filter((x) => {
        if (seen.has(x.importer)) return false;
        seen.add(x.importer);
        return true;
      })
      .map((x, i) => ({ label: x.importer, key: `${x.importer}-${i}` }));
  }, []);

  const importerNames = useMemo(
    () => [...getUniqueImporterNames(importers)],
    [importers, getUniqueImporterNames]
  );

  // Main jobs hook
  const {
    rows,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    fetchJobs,
    setRows,
    unresolvedCount,
    loading,
    invalidateCache,
  } = useFetchJobList(
    detailedStatus,
    selectedYearState,
    props.status,
    selectedICD,
    debouncedSearchQuery,
    selectedImporter,
    selectedBeType,
    showUnresolvedOnly,
    selectedBranch,
    selectedMode,
    selectedCategory
  );

  // Fetch query status when rows change
  useEffect(() => {
    if (rows && rows.length > 0) {
      const jobNos = rows.map((r) => r.job_no).filter(Boolean);
      fetchQueryStatusForJobs(jobNos);
    }
  }, [rows, fetchQueryStatusForJobs]);

  // Sort jobs list with active query priority at TOP (resolved queries do not bypass normal order)
  const sortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return [...rows].sort((a, b) => {
      const statA = clientQueriesStatus[a.job_no] || {};
      const statB = clientQueriesStatus[b.job_no] || {};

      const scoreA = statA.hasUnseen ? 3 : statA.hasOpenQueries ? 2 : 0;
      const scoreB = statB.hasUnseen ? 3 : statB.hasOpenQueries ? 2 : 0;

      return scoreB - scoreA;
    });
  }, [rows, clientQueriesStatus]);

  const handleRedClick = useCallback((job) => {
    setRaiseQueryJob(job);
    setRaiseQueryMessage("");
    setRaiseQueryAttachments([]);
    setRaiseQueryOpen(true);
  }, []);

  const handleOpenQueryChat = useCallback(async (job) => {
    setQueryChatJob(job);
    setQueryChatOpen(true);
    setQueryChatLoading(true);
    setActiveQueryIndex(0);
    setChatAttachments([]);

    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: job.job_no },
      });
      const queries = resp.data?.queries || [];
      setQueryChatData(queries);

      setClientQueriesStatus((prev) => ({
        ...prev,
        [job.job_no]: { ...prev[job.job_no], hasUnseen: false },
      }));
    } catch (error) {
      console.error("Failed to load client queries:", error);
      setQuerySnackbar({ open: true, message: "Failed to load queries", severity: "error" });
    } finally {
      setQueryChatLoading(false);
    }
  }, []);

  const handleYellowClick = useCallback((job) => {
    const queryStat = clientQueriesStatus[job.job_no] || { hasQueries: false };
    if (!queryStat.hasQueries) {
      setQuerySnackbar({ open: true, message: "No query history found. Click Red to raise a query.", severity: "info" });
      return;
    }
    handleOpenQueryChat(job);
  }, [clientQueriesStatus, handleOpenQueryChat]);

  const handleResolveOpenQuery = useCallback(async (job) => {
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: job.job_no, status: "open" },
      });
      const openQueries = resp.data?.queries || [];
      if (openQueries.length === 0) {
        setQuerySnackbar({ open: true, message: "No open queries found for this job.", severity: "warning" });
        return;
      }

      const targetQuery = openQueries[0];
      await axios.put(`${apiString}/client-queries/${targetQuery._id}/resolve`, {
        resolvedBy: user?.name || "Operations Team",
        resolutionNote: "Resolved by internal team",
      });

      setQuerySnackbar({ open: true, message: "Query resolved successfully.", severity: "success" });

      if (job?.job_no) {
        fetchQueryStatusForJobs([job.job_no]);
      }
    } catch (error) {
      console.error("Failed to resolve query:", error);
      setQuerySnackbar({ open: true, message: "Failed to resolve query.", severity: "error" });
    }
  }, [user, fetchQueryStatusForJobs]);

  const handleFileUpload = useCallback(async (e, isRaiseQuery = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${apiString}/client-queries/upload-attachment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.fileUrl) {
        const fileObj = {
          fileName: res.data.fileName || file.name,
          fileUrl: res.data.fileUrl,
          fileType: res.data.fileType || file.type,
        };

        if (isRaiseQuery) {
          setRaiseQueryAttachments((prev) => [...prev, fileObj]);
        } else {
          setChatAttachments((prev) => [...prev, fileObj]);
        }
        setQuerySnackbar({ open: true, message: `Attachment uploaded: ${file.name}`, severity: "success" });
      }
    } catch (err) {
      console.error("Attachment upload failed:", err);
      setQuerySnackbar({ open: true, message: "Attachment upload failed.", severity: "error" });
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  }, []);
  const handleSendReply = useCallback(async (queryId, replyText, resetCallback) => {
    const textToSend = replyText !== undefined ? replyText : queryChatReply;
    if (!textToSend.trim() && chatAttachments.length === 0) return;
    setQueryChatSending(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      await axios.put(`${apiString}/client-queries/${queryId}/reply`, {
        message: textToSend.trim(),
        repliedBy: user?.name || "Operations Team",
        senderType: "admin",
        attachments: chatAttachments,
      });

      const resp = await axios.get(`${apiString}/client-queries`, {
        params: { job_no: queryChatJob.job_no },
      });
      setQueryChatData(resp.data?.queries || []);
      setQueryChatReply("");
      setChatAttachments([]);
      if (resetCallback) resetCallback();

      if (queryChatJob?.job_no) {
        fetchQueryStatusForJobs([queryChatJob.job_no]);
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
      setQuerySnackbar({ open: true, message: "Failed to send reply", severity: "error" });
    } finally {
      setQueryChatSending(false);
    }
  }, [queryChatReply, chatAttachments, queryChatJob, user, fetchQueryStatusForJobs]);

  const handleRaiseQuerySubmit = useCallback(async (messageText) => {
    const msg = messageText !== undefined ? messageText : raiseQueryMessage;
    if (!msg.trim() && raiseQueryAttachments.length === 0) {
      setQuerySnackbar({ open: true, message: "Message or attachment is required", severity: "warning" });
      return;
    }
    setRaiseQuerySending(true);
    try {
      const apiString = process.env.REACT_APP_API_STRING || "";
      const payload = {
        module_type: "import",
        job_no: raiseQueryJob.job_no,
        job_id: raiseQueryJob._id,
        subject: "Operations Query",
        message: msg.trim() || "Query raised with attachment",
        client_name: user?.name || "Operations Team",
        senderType: "admin",
        attachments: raiseQueryAttachments,
      };

      await axios.post(`${apiString}/client-queries`, payload);

      setQuerySnackbar({ open: true, message: "Query raised successfully", severity: "success" });
      setRaiseQueryOpen(false);
      setRaiseQueryMessage("");
      setRaiseQueryAttachments([]);

      if (raiseQueryJob?.job_no) {
        fetchQueryStatusForJobs([raiseQueryJob.job_no]);
      }
    } catch (error) {
      console.error("Failed to raise query:", error);
      setQuerySnackbar({ open: true, message: "Failed to raise query", severity: "error" });
    } finally {
      setRaiseQuerySending(false);
    }
  }, [raiseQueryMessage, raiseQueryAttachments, raiseQueryJob, user, fetchQueryStatusForJobs]);

  const renderQueryModals = useCallback(() => {
    const activeQuery = queryChatData[activeQueryIndex];

    const chatMessages = [];
    if (activeQuery) {
      chatMessages.push({
        id: "original",
        senderName: activeQuery.client_name || "Client",
        message: activeQuery.message,
        subject: activeQuery.subject,
        createdAt: activeQuery.createdAt,
        align: "left",
        attachments: activeQuery.attachments || [],
        senderType: "client",
      });

      if (activeQuery.replies) {
        activeQuery.replies.forEach((r, ri) => {
          chatMessages.push({
            id: r._id || `reply-${ri}`,
            senderName: r.repliedBy,
            message: r.message,
            createdAt: r.repliedAt,
            align: r.senderType === "admin" || r.senderType === "operation" ? "right" : "left",
            attachments: r.attachments || [],
            senderType: r.senderType || "admin",
          });
        });
      }
    }

    const formatChatTime = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    };

    return (
      <>
        {/* Client Query Chat Dialog */}
        <Dialog
          open={queryChatOpen}
          onClose={() => {
            setQueryChatOpen(false);
            setQueryChatJob(null);
            setQueryChatData([]);
            setQueryChatReply("");
            setChatAttachments([]);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px", overflow: "hidden" } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.5,
              px: 3,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Queries &amp; Replies
              </Typography>
              {queryChatJob?.job_no && (
                <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.2 }}>
                  Job: {queryChatJob.job_no}
                </Typography>
              )}
            </Box>
            <IconButton
              onClick={() => {
                setQueryChatOpen(false);
                setQueryChatJob(null);
                setQueryChatData([]);
                setQueryChatReply("");
                setChatAttachments([]);
              }}
              size="small"
              sx={{ color: "#fff" }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </DialogTitle>

          {queryChatData.length > 1 && (
            <div style={{ display: "flex", gap: "8px", padding: "8px 12px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", overflowX: "auto", whiteSpace: "nowrap" }}>
              {queryChatData.map((q, idx) => (
                <button
                  key={q._id || idx}
                  onClick={() => setActiveQueryIndex(idx)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: activeQueryIndex === idx ? "#2563eb" : "#d1d5db",
                    backgroundColor: activeQueryIndex === idx ? "#eff6ff" : "#fff",
                    color: activeQueryIndex === idx ? "#2563eb" : "#374151",
                    fontWeight: "600",
                    fontSize: "11px",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  Query #{idx + 1} ({q.status?.toUpperCase()})
                </button>
              ))}
            </div>
          )}

          <DialogContent sx={{ p: 2, bgcolor: "#efeae2", minHeight: "320px", maxHeight: "420px", display: "flex", flexDirection: "column" }}>
            {queryChatLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : !activeQuery ? (
              <Typography sx={{ textTransform: "none", textAlign: "center", color: "#6b7280", py: 4 }}>
                No queries found.
              </Typography>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: msg.align === "right" ? "flex-end" : "flex-start",
                      marginBottom: "6px",
                    }}
                  >
                    {msg.subject && (
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "2px" }}>
                        Subject: {msg.subject}
                      </div>
                    )}

                    <div
                      style={{
                        maxWidth: "80%",
                        padding: "8px 12px",
                        borderRadius: msg.align === "right" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                        backgroundColor: msg.align === "right" ? "#dcf8c6" : "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: "700", color: msg.align === "right" ? "#15803d" : "#2563eb", marginBottom: "2px" }}>
                        {msg.senderName} ({msg.senderType})
                      </div>
                      <div style={{ fontSize: "13px", color: "#1f2937", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {msg.message}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {msg.attachments.map((att, attIdx) => (
                            <a
                              key={attIdx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                color: "#2563eb",
                                textDecoration: "none",
                                backgroundColor: "rgba(37, 99, 235, 0.08)",
                                padding: "2px 6px",
                                borderRadius: "4px"
                              }}
                            >
                              <InsertDriveFileIcon style={{ fontSize: 14 }} />
                              {att.fileName || "Attachment"}
                            </a>
                          ))}
                        </div>
                      )}

                      <div style={{ fontSize: "10px", color: "#9ca3af", textAlign: "right", marginTop: "4px" }}>
                        {formatChatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            {activeQuery && activeQuery.status === "open" ? (
              <ChatReplyInputSection
                onSendReply={handleSendReply}
                sending={queryChatSending}
                uploadingAttachment={uploadingAttachment}
                attachments={chatAttachments}
                onFileUpload={(e) => handleFileUpload(e, false)}
                onDeleteAttachment={(idx) => setChatAttachments((prev) => prev.filter((_, i) => i !== idx))}
                fileInputRef={fileInputRef}
                activeQueryId={activeQuery._id}
              />
            ) : (
              <div style={{ marginTop: "12px", padding: "8px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "8px", textAlign: "center", fontWeight: "700", fontSize: "12px" }}>
                This query has been marked as RESOLVED.
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Raise Query Dialog */}
        <Dialog
          open={raiseQueryOpen}
          onClose={() => setRaiseQueryOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: "12px" } }}
        >
          {raiseQueryOpen && (
            <RaiseQueryDialogContent
              job={raiseQueryJob}
              onSubmit={handleRaiseQuerySubmit}
              onClose={() => setRaiseQueryOpen(false)}
              sending={raiseQuerySending}
              uploadingAttachment={uploadingAttachment}
              attachments={raiseQueryAttachments}
              onFileUpload={(e) => handleFileUpload(e, true)}
              onDeleteAttachment={(idx) => setRaiseQueryAttachments((prev) => prev.filter((_, i) => i !== idx))}
              fileInputRef={raiseFileInputRef}
            />
          )}
        </Dialog>

        {/* Global Query Snackbar */}
        <Snackbar
          open={querySnackbar.open}
          autoHideDuration={4000}
          onClose={() => setQuerySnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert severity={querySnackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
            {querySnackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }, [
    queryChatOpen,
    queryChatData,
    queryChatJob,
    queryChatLoading,
    queryChatReply,
    queryChatSending,
    activeQueryIndex,
    chatAttachments,
    uploadingAttachment,
    raiseQueryOpen,
    raiseQueryJob,
    raiseQueryMessage,
    raiseQuerySending,
    raiseQueryAttachments,
    querySnackbar,
    handleFileUpload,
    handleSendReply,
    handleRaiseQuerySubmit,
  ]);

  // Sync local input -> searchQuery
  useEffect(() => {
    setSearchQuery(localInput);
  }, [localInput, setSearchQuery]);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => {
      const s = String(searchQuery || "").trim();
      // Only extract if it looks like a formatted label with a separator (hyphen/em-dash)
      // This prevents corruption of BL numbers that start with digits but have letters (e.g. 100GX...)
      const looksLikeFormattedJob = /^\d+.*[-—]/.test(s);
      setDebouncedSearchQuery(looksLikeFormattedJob ? extractJobNo(s) : s);
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const tableData = useMemo(
    () => rows.map((row, idx) => ({ ...row, id: row._id || `row-${idx}` })),
    [rows]
  );

  const getRowProps = useMemo(
    () =>
      ({ row }) => ({
        className: getTableRowsClassname(row),
        style: getTableRowInlineStyle(row),
        sx: { textAlign: "center" },
      }),
    [rows, refreshTrigger]
  );

  // unresolved count from server
  useEffect(() => {
    if (props.status === "Pending" && onUnresolvedCountChange) {
      onUnresolvedCountChange(unresolvedCount);
    }
  }, [unresolvedCount, onUnresolvedCountChange, props.status]);

  // Row update from child editor (snackbar for moves)
  const handleRowDataUpdate = useCallback(
    (jobId, updatedData) => {
      if (selectedYearState) invalidateCache(selectedYearState);
      setRows((prev) => {
        const updated = prev.map((r) => {
          if (r._id !== jobId) return r;

          // Start with a shallow copy of the existing row
          const next = { ...r };

          // If updatedData is an object, merge keys into `next`.
          // Support dotted paths like 'container_nos.0.arrival_date'.
          if (updatedData && typeof updatedData === "object") {
            Object.entries(updatedData).forEach(([k, v]) => {
              if (k === "__op") return; // ignore op marker

              if (k.includes(".")) {
                const parts = k.split(".");

                // Ensure top-level array/object exists (common case: container_nos)
                if (parts[0] === "container_nos") {
                  if (!Array.isArray(next.container_nos)) {
                    next.container_nos = Array.isArray(r.container_nos)
                      ? [...r.container_nos]
                      : [];
                  }
                }

                let cur = next;
                for (let i = 0; i < parts.length; i++) {
                  const p = parts[i];
                  const isLast = i === parts.length - 1;
                  const nextPart = parts[i + 1];

                  if (isLast) {
                    // assign final value
                    if (Array.isArray(cur) && /^\d+$/.test(p)) {
                      cur[parseInt(p, 10)] = v;
                    } else {
                      cur[p] = v;
                    }
                  } else {
                    // prepare next container
                    if (/^\d+$/.test(nextPart)) {
                      // next should be an array
                      if (!cur[p]) cur[p] = [];
                      if (!Array.isArray(cur[p])) cur[p] = [];
                      cur = cur[p];
                    } else {
                      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
                      cur = cur[p];
                    }
                  }
                }
              } else {
                // simple top-level key
                if (k === "container_nos" && Array.isArray(v)) {
                  next.container_nos = [...v];
                } else {
                  next[k] = v;
                }
              }
            });
          }

          return next;
        });
        const updatedJob = updated.find((j) => j._id === jobId);
        if (updatedJob && updatedData.detailed_status) {
          if (
            detailedStatus !== "all" &&
            updatedJob.detailed_status !== detailedStatus
          ) {
            const filtered = updated.filter((j) => j._id !== jobId);
            setSnackbar({
              open: true,
              message: `Job moved to '${updatedJob.detailed_status}'. Filter: '${detailedStatus}'`,
            });
            return filtered;
          }
        }
        return updated;
      });
      setRefreshTrigger((x) => x + 1);

      // Debug info: log update details to help trace disappearing rows
      try {
        console.log(
          "handleRowDataUpdate:",
          { jobId, updatedData },
          "currentFilter:",
          detailedStatus,
          "page:",
          currentPage,
          new Date().toISOString()
        );
      } catch (e) {
        /* ignore */
      }

      // Only refetch page if the job's detailed_status changed (moved between filters).
      // This avoids immediate refetch that may remove the row if server-side logic briefly
      // changes data while we're editing simple fields like ETA.
      const shouldRefetch = (() => {
        try {
          // updatedData may be a full server job or a partial payload
          const newStatus =
            (updatedData && updatedData.detailed_status) || null;
          // find previous status from current rows (rows state may be stale here; use fetchJobs as fallback)
          const prev = rows.find((r) => r._id === jobId);
          const prevStatus = prev ? prev.detailed_status : null;
          return newStatus && prevStatus && newStatus !== prevStatus;
        } catch (e) {
          return false;
        }
      })();

      if (shouldRefetch) {
        setTimeout(() => fetchJobs(currentPage, showUnresolvedOnly, true), 300);
      }
    },
    [
      selectedYearState,
      invalidateCache,
      setRows,
      detailedStatus,
      fetchJobs,
      currentPage,
      showUnresolvedOnly,
    ]
  );

  const handleSearchClick = () => {
    // optional: force immediate debounce update or page reset
    setSearchQuery(localInput);
    // if you want to always go to page 1:
    // fetchJobs(1, showUnresolvedOnly, true);
  };

  // Years initialization
  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filtered = res.data.filter((y) => y !== null);
        setYears(filtered);

        const now = new Date();
        const year = now.getFullYear();
        const mon = now.getMonth() + 1;
        const prevTwo = String((year - 1) % 100).padStart(2, "0");
        const currTwo = String(year).slice(-2);
        const nextTwo = String((year + 1) % 100).padStart(2, "0");
        const defaultPair =
          mon >= 4 ? `${currTwo}-${nextTwo}` : `${prevTwo}-${currTwo}`;

        if (!selectedYearState && filtered.length > 0) {
          setSelectedYearState(
            filtered.includes(defaultPair) ? defaultPair : filtered[0]
          );
        }
      } catch (e) {
        console.error("Error fetching years:", e);
      }
    }
    getYears();
  }, [selectedYearState, setSelectedYearState]);

  // Handlers
  const handleICDChange = useCallback(
    (e) => setSelectedICD(e.target.value),
    [setSelectedICD]
  );
  const handleImporterChange = useCallback(
    (e, v) => setSelectedImporter(v),
    [setSelectedImporter]
  );
  const handleYearChange = useCallback(
    (e) => setSelectedYearState(e.target.value),
    [setSelectedYearState]
  );
  const handleDetailedStatusChange = useCallback(
    (e) => setDetailedStatus(e.target.value),
    [setDetailedStatus]
  );

  const handleBeTypeChange = useCallback(
    (e) => setSelectedBeType(e.target.value),
    [setSelectedBeType]
  );

  const handleLocalInputChange = useCallback((e) => {
    setLocalInput(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setLocalInput("");
    setSearchQuery("");
  }, [setSearchQuery]);

  const renderTopToolbarCustomActions = useCallback(
    () => (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", fontSize: "1.5rem" }}
          >
          {props.status} Jobs: {total}
        </Typography>
      </Box>

        <TextField
          select
          size="small"
          variant="outlined"
          label="ICD Code"
          value={selectedICD}
          onChange={handleICDChange}
          sx={{ width: "135px", marginRight: "10px" }}
        >
          <MenuItem value="all">All ICDs</MenuItem>
          {dynamicICDs.map((icd, index) => (
            <MenuItem key={index} value={icd}>{icd}</MenuItem>
          ))}
          {/* Fallback for selectedICD if not in dynamic list to prevent MUI warning */}
          {selectedICD !== "all" && !dynamicICDs.includes(selectedICD) && (
            <MenuItem value={selectedICD}>{selectedICD}</MenuItem>
          )}
        </TextField>

        <TextField
          select
          size="small"
          variant="outlined"
          label="Type of BE"
          value={selectedBeType}
          onChange={handleBeTypeChange}
          sx={{ width: "135px", marginRight: "10px" }}
        >
          <MenuItem value="all">All BE Types</MenuItem>
          <MenuItem value="Home">Home</MenuItem>
          <MenuItem value="In-Bond">In-Bond</MenuItem>
          <MenuItem value="Ex-Bond">Ex-Bond</MenuItem>
        </TextField>


        <Autocomplete
          sx={{ width: "220px", marginRight: "10px" }}
          freeSolo
          options={importerNames.map((o) => o.label)}
          value={selectedImporter || ""}
          onInputChange={handleImporterChange}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              size="small"
              fullWidth
              label="Select Importer"
            />
          )}
        />

        {years.length > 0 && (
          <TextField
            select
            size="small"
            value={selectedYearState}
            onChange={handleYearChange}
            sx={{ width: "90px", marginRight: "10px" }}
          >
            {years.map((y, i) => (
              <MenuItem key={`year-${y}-${i}`} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          size="small"
          value={selectedMode}
          onChange={(e) => setSelectedMode(e.target.value)}
          sx={{ width: "110px", marginRight: "10px" }}
        >
          <MenuItem value="all">All Modes</MenuItem>
          <MenuItem value="SEA">SEA</MenuItem>
          <MenuItem value="AIR">AIR</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          value={detailedStatus}
          onChange={handleDetailedStatusChange}
          sx={{ width: "220px", marginRight: "10px" }}
        >
          {detailedStatusOptions.map((o, i) => (
            <MenuItem key={`status-${o.id || o.value || i}`} value={o.value}>
              {o.name}
            </MenuItem>
          ))}
        </TextField>

        {/* View Mode Toggle Switch */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            bgcolor: "#f1f5f9",
            p: "2px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            marginRight: "10px",
          }}
        >
          <Tooltip title="Full Table View (Current UI)" arrow>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "full" ? "active" : ""}`}
              onClick={() => handleViewModeChange("full")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: viewMode === "full" ? "#ffffff" : "transparent",
                color: viewMode === "full" ? "#2563eb" : "#64748b",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: viewMode === "full" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <TableRowsIcon sx={{ fontSize: 16 }} />
              Full
            </button>
          </Tooltip>
          <Tooltip title="Shrink List View (Job No, IGM & Latest Date in Seq)" arrow>
            <button
              type="button"
              className={`toggle-btn ${viewMode === "shrink" ? "active" : ""}`}
              onClick={() => handleViewModeChange("shrink")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 9px",
                border: "none",
                borderRadius: "6px",
                backgroundColor: viewMode === "shrink" ? "#ffffff" : "transparent",
                color: viewMode === "shrink" ? "#2563eb" : "#64748b",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: viewMode === "shrink" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <ViewHeadlineIcon sx={{ fontSize: 16 }} />
              Shrink
            </button>
          </Tooltip>
        </Box>

        {/* Simple search input (no typeahead/suggestions) */}
        <TextField
          value={localInput}
          onChange={handleLocalInputChange}
          placeholder="Search by Job No, Importer, or AWB/BL Number"
          size="small"
          variant="outlined"
          sx={{ width: "250px", marginRight: "10px" }}
          InputProps={{
            endAdornment: (
              <IconButton size="small" onClick={handleSearchClick}>
                <SearchIcon fontSize="small" />
              </IconButton>
            ),
          }}
        />

        <IconButton onClick={handleOpen}>
          <DownloadIcon titleAccess="Download Excel" />
        </IconButton>
      </div>
    ),
    [
      props.status,
      total,
      selectedICD,
      handleICDChange,
      importerNames,
      selectedImporter,
      setSelectedImporter,
      years,
      selectedYearState,
      handleYearChange,
      detailedStatus,
      handleDetailedStatusChange,
      localInput,
      handleLocalInputChange,
      handleOpen,
      selectedBeType, // dependency
      handleBeTypeChange, // dependency
      dynamicICDs,
      myRequestsOpen, // Added myRequestsOpen to dependencies
      viewMode,
      handleViewModeChange,
    ]
  );

  const [expandedRowIds, setExpandedRowIds] = useState({});

  const toggleRowExpanded = useCallback((rowId) => {
    if (!rowId) return;
    setExpandedRowIds((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  const columns = useJobColumns(
    (jobId, updatedData) => handleRowDataUpdate(jobId, updatedData),
    (job_no, year) =>
      navigate(`/import-dsr/job/${job_no}/${year}`, {
        state: {
          fromJobList: true,
          currentTab: (() => {
            switch (props.status) {
              case "Pending":
                return 0;
              case "Completed":
                return 1;
              case "Cancelled":
                return 2;
              case "Billing_Confirmation":
                return 3;
              default:
                return 0;
            }
          })(),
          searchQuery,
          detailedStatus,
          selectedICD,
          selectedImporter,
          selectedBeType, // persist
          selectedBranch,
          selectedMode
        },
      }),
    setRows, // <-- pass here
    invalidateCache,
    selectedYearState,
    clientQueriesStatus,
    handleRedClick,
    handleYellowClick,
    handleResolveOpenQuery,
    handleOpenQueryChat,
    viewMode,
    expandedRowIds,
    toggleRowExpanded
  );

  const table = useMaterialReactTable({
    columns,
    data: sortedRows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,
    enableRowVirtualization: true,
    rowVirtualizerOptions: { overscan: 8 },
    initialState: { density: "compact", columnPinning: { left: ["job_no"] } },
    enableGlobalFilter: false,
    enableGrouping: true,
    enableColumnFilters: false,
    enableColumnActions: false,
    enableStickyHeader: true,
    enablePinning: true,
    muiTableContainerProps: { sx: { maxHeight: "690px", overflowY: "auto" } },
    muiTableBodyRowProps: ({ row }) => {
      const baseProps = getRowProps({ row });
      if (viewMode === "shrink") {
        return {
          ...baseProps,
          style: {
            ...(baseProps.style || {}),
            cursor: "pointer",
          },
          onClick: (event) => {
            const targetTagName = event.target?.tagName?.toLowerCase() || "";
            if (["a", "button", "input", "textarea", "select"].includes(targetTagName)) {
              return;
            }
            if (
              event.target?.closest?.(
                "a, button, input, textarea, select, .MuiIconButton-root, .MuiChip-root"
              )
            ) {
              return;
            }
            toggleRowExpanded(row.original._id);
          },
        };
      }
      return baseProps;
    },
    muiTableHeadCellProps: { sx: { position: "sticky", top: 0, zIndex: 999 } },
    renderTopToolbarCustomActions: renderTopToolbarCustomActions,
  });

  return (
    <div className="table-container">
      <MaterialReactTable table={table} />

      {/* Render Query Modals */}
      {renderQueryModals && renderQueryModals()}

      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={(e, page) => handlePageChange(page)}
        color="primary"
        sx={{ mt: 2, display: "flex", justifyContent: "center" }}
      />

      <SelectImporterModal
        open={open}
        handleClose={handleClose}
        status={props.status}
        detailedStatus={detailedStatus}
      />

      <Dialog
        open={myRequestsOpen}
        onClose={() => setMyRequestsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1a237e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          My Document Requests
          <Button onClick={() => setMyRequestsOpen(false)}>Close</Button>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <MyDocRequests />
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ open: false, message: "" })}
          severity="info"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default React.memo(JobList);
