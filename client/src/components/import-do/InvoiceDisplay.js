import React, { useState } from "react";
import {
  Box,
  Typography,
  Link,
  Button,
  Modal,
  Paper,
  Chip,
  Stack,
  Divider,
  IconButton,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const InvoiceDisplay = ({ row, showOOC = true }) => {
  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);

  const {
    do_shipping_line_invoice = [],
    shipping_line_invoice_imgs = [],
    concor_invoice_and_receipt_copy = [],
    thar_invoices = [],
    hasti_invoices = [],
    icd_cfs_invoice_img = [],
    ooc_copies = [],
  } = row;

  // Combine shipping line invoices
  const getProcessedShippingLineInvoices = () => {
    let invoices = [];

    if (Array.isArray(do_shipping_line_invoice)) {
      do_shipping_line_invoice.forEach((item, index) => {
        invoices.push({
          type: "rich",
          data: item,
          name: item.document_name || `Shipping Invoice ${index + 1}`,
          section: "shipping_line",
        });
      });
    }

    if (Array.isArray(shipping_line_invoice_imgs)) {
      shipping_line_invoice_imgs.forEach((url, index) => {
        if (url) {
          invoices.push({
            type: "simple",
            name: `Shipping Invoice ${index + 1}`,
            url,
            section: "shipping_line",
          });
        }
      });
    }

    return invoices;
  };

  const processedShippingLineInvoices = getProcessedShippingLineInvoices();

  // Invoice sections (excluding OOC)
  const invoiceSections = [
    {
      key: "shipping_line",
      title: "Shipping Line",
      items: processedShippingLineInvoices,
      icon: "🛳️",
      isRich: true,
    },
    {
      key: "concor",
      title: "Concor",
      items: concor_invoice_and_receipt_copy,
      icon: "🚚",
    },
    {
      key: "thar",
      title: "Thar",
      items: thar_invoices,
      icon: "🚛",
    },
    {
      key: "hasti",
      title: "Hasti",
      items: hasti_invoices,
      icon: "🚚",
    },
    {
      key: "icd_cfs",
      title: "ICD/CFS",
      items: icd_cfs_invoice_img,
      icon: "🏢",
    },
  ].filter((section) => section.items && section.items.length > 0);

  // OOC section separate
  const oocSection = {
    key: "ooc",
    title: "OOC Copies",
    items: ooc_copies,
    icon: <FileCopyIcon fontSize="small" />,
    color: "info",
  };

  const totalInvoiceCount = invoiceSections.reduce(
    (sum, section) => sum + section.items.length,
    0
  );
  const totalOOCCount = ooc_copies?.length || 0;

  const handleOpenModal = (sectionKey = null) => {
    setSelectedSection(sectionKey);
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelectedSection(null);
  };

  const renderSectionItems = (section) => {
    return section.items.map((item, index) => {
      if (section.isRich && item.type === "rich") {
        const { data } = item;
        return (
          <Box key={index} sx={{ mb: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 0.5,
              }}
            >
              <Typography variant="body2" fontWeight="medium">
                {item.name}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                {data.is_draft && (
                  <Chip label="Draft" size="small" color="warning" />
                )}
                {data.is_final && (
                  <Chip label="Final" size="small" color="success" />
                )}
              </Stack>
            </Box>

            {/* Compact details */}
            {(data.document_amount_details || data.payment_mode) && (
              <Box sx={{ display: "flex", gap: 1, mb: 0.5 }}>
                {data.document_amount_details && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    <strong>Amt:</strong> {data.document_amount_details}
                  </Typography>
                )}
                {data.payment_mode && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    <strong>Mode:</strong> {data.payment_mode}
                  </Typography>
                )}
              </Box>
            )}

            {/* Compact links */}
            <Stack spacing={0.5}>
              {Array.isArray(data.url) &&
                data.url.map((url, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <DescriptionIcon fontSize="small" color="action" />
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      sx={{ flexGrow: 1 }}
                    >
                      Invoice {data.url.length > 1 ? i + 1 : ""}
                    </Link>
                  </Box>
                ))}

              {Array.isArray(data.payment_recipt) &&
                data.payment_recipt.map((url, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <ReceiptIcon fontSize="small" color="secondary" />
                    <Link
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="caption"
                      color="secondary"
                      sx={{ flexGrow: 1 }}
                    >
                      Receipt {data.payment_recipt.length > 1 ? i + 1 : ""}
                    </Link>
                  </Box>
                ))}
            </Stack>
          </Box>
        );
      }

      // Simple invoice/OOC item
      const url = typeof item === "string" ? item : item.url;
      const name =
        typeof item === "string"
          ? `${section.title} ${index + 1}`
          : item.name;

      if (!url) return null;

      return (
        <Box
          key={index}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 0.5,
            borderRadius: 0.5,
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          {section.key === "ooc" ? (
            <FileCopyIcon fontSize="small" color="info" />
          ) : (
            <DescriptionIcon fontSize="small" color="action" />
          )}
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ flexGrow: 1 }}
          >
            {name}
          </Link>
        </Box>
      );
    });
  };

  return (
    <>
      {/* Vertical Layout - Invoices above OOC */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "flex-start" }}>
        {/* Invoices Button */}
        {totalInvoiceCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReceiptIcon />}
            onClick={() => handleOpenModal()}
            sx={{
              textTransform: "none",
              borderRadius: 1,
              px: 1.5,
              py: 0.25,
              fontSize: "0.75rem",
              minWidth: "auto",
              width: "100%",
              justifyContent: "flex-start",
            }}
          >
            {totalInvoiceCount} Invoices
          </Button>
        )}

        {/* OOC Button (below invoices) */}
        {showOOC && totalOOCCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileCopyIcon />}
            onClick={() => handleOpenModal("ooc")}
            sx={{
              textTransform: "none",
              borderRadius: 1,
              px: 1.5,
              py: 0.25,
              fontSize: "0.75rem",
              minWidth: "auto",
              width: "100%",
              justifyContent: "flex-start",
              borderColor: "info.main",
              color: "info.main",
              "&:hover": {
                borderColor: "info.dark",
                bgcolor: "info.lighter",
              },
            }}
          >
            {totalOOCCount} OOC Copies
          </Button>
        )}
      </Box>

      {/* Invoice/OOC Modal */}
      <Modal open={open} onClose={handleCloseModal}>
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", sm: "400px" },
            maxHeight: "85vh",
            overflow: "auto",
            p: 2,
            borderRadius: 1.5,
          }}
        >
          {/* Modal Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {selectedSection === "ooc" ? (
                <FileCopyIcon color="info" />
              ) : (
                <ReceiptIcon color="primary" />
              )}
              <Typography variant="subtitle1" fontWeight="bold">
                {selectedSection === "ooc"
                  ? "OOC Copies"
                  : selectedSection
                    ? invoiceSections.find((s) => s.key === selectedSection)?.title
                    : "All Invoices"}
              </Typography>
              <Chip
                label={
                  selectedSection === "ooc"
                    ? `${totalOOCCount} items`
                    : selectedSection
                      ? `${invoiceSections.find((s) => s.key === selectedSection)
                        ?.items.length || 0
                      } items`
                      : `${totalInvoiceCount} total`
                }
                size="small"
                color={selectedSection === "ooc" ? "info" : "primary"}
                variant="outlined"
              />
            </Box>
            <IconButton onClick={handleCloseModal} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Section Navigation (if viewing all) */}
          {!selectedSection && (
            <Stack spacing={1}>
              {invoiceSections.map((section) => (
                <Paper
                  key={section.key}
                  variant="outlined"
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleOpenModal(section.key)}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>{section.icon}</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {section.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={section.items.length}
                        size="small"
                        variant="outlined"
                      />
                      <KeyboardArrowRightIcon fontSize="small" />
                    </Box>
                  </Box>
                </Paper>
              ))}

              {/* OOC Section Card */}
              {showOOC && totalOOCCount > 0 && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    cursor: "pointer",
                    borderColor: "info.main",
                    "&:hover": {
                      bgcolor: "info.lighter",
                    },
                  }}
                  onClick={() => handleOpenModal("ooc")}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FileCopyIcon fontSize="small" color="info" />
                      <Typography variant="body2" fontWeight="medium" color="info.main">
                        OOC Copies
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={totalOOCCount}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                      <KeyboardArrowRightIcon fontSize="small" />
                    </Box>
                  </Box>
                </Paper>
              )}
            </Stack>
          )}

          {/* Single Section View */}
          {selectedSection && (
            <>
              {selectedSection !== "ooc" && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    onClick={() => setSelectedSection(null)}
                    startIcon={<ArrowBackIcon />}
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    Back
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {invoiceSections.find((s) => s.key === selectedSection)?.title}
                  </Typography>
                </Box>
              )}

              <Box sx={{ maxHeight: "50vh", overflow: "auto", pr: 0.5 }}>
                {selectedSection === "ooc"
                  ? renderSectionItems(oocSection)
                  : renderSectionItems(
                    invoiceSections.find((s) => s.key === selectedSection)
                  )}
              </Box>
            </>
          )}

          {/* Footer Info */}
          <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
              Click links to view/download documents
            </Typography>
          </Box>
        </Paper>
      </Modal>
    </>
  );
};

export default InvoiceDisplay;