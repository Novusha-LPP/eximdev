import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";

const FILE_TYPES = ["Document", "Image", "Video", "Audio", "Archive", "Other"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AttachmentUpload({ attachments, setAttachments }) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [ticketId, setTicketId] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);

    if (validFiles.length !== files.length) {
      const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      toast.error(`${oversizedFiles.length} file(s) exceed the 10MB limit`);
    }

    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (!ticketId) {
      toast.error("Please select a ticket");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    const newAttachments = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", ticketId);
      formData.append("description", description);

      try {
        // Simulate upload progress
        const fileId = Date.now() + Math.random();
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = Math.min(prev[fileId] + 10, 90);
            return { ...prev, [fileId]: newProgress };
          });
        }, 200);

        // In a real app, you would make an API call here
        await new Promise(resolve => setTimeout(resolve, 2000));
        clearInterval(progressInterval);

        // Add to attachments list
        const newAttachment = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          upload_date: new Date().toISOString(),
          description: description,
          ticket_id: ticketId,
        };

        newAttachments.push(newAttachment);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments([...attachments, ...newAttachments]);
      toast.success(`${newAttachments.length} file(s) uploaded successfully`);
    }

    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setTicketId("");
    setDescription("");
    setUploadProgress({});
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this attachment?")) {
      setAttachments(attachments.filter(att => att.id !== id));
      toast.success("Attachment deleted");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType.startsWith("video/")) return "Video";
    if (mimeType.startsWith("audio/")) return "Audio";
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return "Document";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("archive")) return "Archive";
    return "Other";
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUploadIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Attachment Upload
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadDialogOpen(true)}>
          Upload Files
        </Button>
      </Box>

      <Card>
        <CardContent>
          {attachments.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                No attachments found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Upload Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attachments.map((attachment) => (
                    <TableRow key={attachment.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <InsertDriveFileIcon color="primary" />
                          <Typography variant="body2">{attachment.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getFileType(attachment.type)} 
                          color="primary" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{formatFileSize(attachment.size)}</TableCell>
                      <TableCell>
                        {new Date(attachment.upload_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{attachment.description || "N/A"}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download">
                          <IconButton size="small" onClick={() => {
                            // In a real app, this would trigger a download
                            toast.success(`Downloading ${attachment.name}`);
                          }}>
                            <CloudDownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(attachment.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Attachments</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                select
                label="Ticket ID"
                size="small"
                fullWidth
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
              >
                <MenuItem value="">Select Ticket</MenuItem>
                {/* In a real app, this would be populated from an API */}
                <MenuItem value="TICKET-001">TICKET-001</MenuItem>
                <MenuItem value="TICKET-002">TICKET-002</MenuItem>
                <MenuItem value="TICKET-003">TICKET-003</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                size="small"
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description for the attachments"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                fullWidth
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                hidden
                multiple
                onChange={handleFileSelect}
              />
            </Grid>
            {selectedFiles.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Selected Files:</Typography>
                {selectedFiles.map((file, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </Box>
                ))}
              </Grid>
            )}
            {Object.keys(uploadProgress).length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Upload Progress:</Typography>
                {Object.entries(uploadProgress).map(([fileId, progress]) => {
                  const file = selectedFiles.find(f => f.name.includes(fileId));
                  return (
                    <Box key={fileId} display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" sx={{ width: 200 }}>
                        {file?.name || "File"}
                      </Typography>
                      <Box sx={{ flexGrow: 1, mx: 1 }}>
                        <LinearProgress variant="determinate" value={progress} />
                      </Box>
                      <Typography variant="body2" sx={{ width: 40 }}>
                        {progress}%
                      </Typography>
                    </Box>
                  );
                })}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!ticketId || selectedFiles.length === 0 || Object.values(uploadProgress).some(p => p < 100)}
          >
            Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? "s" : ""}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
