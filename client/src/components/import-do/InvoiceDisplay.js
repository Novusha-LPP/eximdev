import React, { useState } from "react";
import { Box, Typography, Collapse, IconButton, Link } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const InvoiceDisplay = ({ row }) => {
  const {
    do_shipping_line_invoice = [],
    shipping_line_invoice_imgs = [],
    concor_invoice_and_receipt_copy = [],
    thar_invoices = [],
    hasti_invoices = [],
    icd_cfs_invoice_img = [],
    ooc_copies = [],
  } = row;

  // Combine shipping line invoices (objects + strings)
  const getProcessedShippingLineInvoices = () => {
    let invoices = [];

    // Process do_shipping_line_invoice (array of objects with rich data)
    if (Array.isArray(do_shipping_line_invoice)) {
      do_shipping_line_invoice.forEach((item, index) => {
        invoices.push({
          type: "rich",
          data: item,
          name: item.document_name || `Invoice ${index + 1}`,
        });
      });
    }

    // Process shipping_line_invoice_imgs (array of strings - legacy/simple)
    if (Array.isArray(shipping_line_invoice_imgs)) {
      shipping_line_invoice_imgs.forEach((url, index) => {
        if (url) {
          invoices.push({
            type: "simple",
            name: `Invoice (Img) ${index + 1}`,
            url,
          });
        }
      });
    }

    return invoices;
  };

  const processedShippingLineInvoices = getProcessedShippingLineInvoices();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        alignItems: "flex-start",
      }}
    >
      <ExpandableSection
        title="Shipping Line Inv"
        items={processedShippingLineInvoices}
        isRich={true}
      />
      <ExpandableSection
        title="Concor Inv"
        items={concor_invoice_and_receipt_copy}
      />
      <ExpandableSection title="Thar Inv" items={thar_invoices} />
      <ExpandableSection title="Hasti Inv" items={hasti_invoices} />
      <ExpandableSection title="ICD/CFS Inv" items={icd_cfs_invoice_img} />
      <ExpandableSection title="OOC Copies" items={ooc_copies} />
    </Box>
  );
};

const ExpandableSection = ({ title, items, isRich = false }) => {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          p: 0.5,
          borderRadius: 1,
          "&:hover": { backgroundColor: "#f5f5f5" },
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: "bold", flexGrow: 1, color: "text.secondary" }}
        >
          {title} ({items.length})
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {open ? (
            <KeyboardArrowUpIcon fontSize="small" />
          ) : (
            <KeyboardArrowDownIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {items.map((item, index) => {
            if (isRich && item.type === "rich") {
              // Render detailed object
              // Data fields: url (array), is_draft, is_final, document_check_date, payment_mode,
              // wire_transfer_method, document_amount_details, payment_request_date,
              // payment_made_date, is_tds, is_payment_made, is_payment_requested,
              // is_non_tds, payment_recipt (array), payment_recipt_date
              const { data } = item;
              return (
                <Box
                  key={index}
                  sx={{ borderLeft: "2px solid #ddd", pl: 1, mb: 1 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: "bold", display: "block" }}
                  >
                    {item.name}
                  </Typography>

                  {/* Status Flags */}
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {data.is_draft && (
                      <StatusTag label="Draft" color="warning" />
                    )}
                    {data.is_final && (
                      <StatusTag label="Final" color="success" />
                    )}
                    {data.is_payment_made && (
                      <StatusTag label="Paid" color="success" />
                    )}
                    {data.is_payment_requested && (
                      <StatusTag label="Pay Req" color="info" />
                    )}
                  </Box>

                  {/* Amount & Payment Info */}
                  {data.document_amount_details && (
                    <InfoRow label="Amt" value={data.document_amount_details} />
                  )}
                  {data.payment_mode && (
                    <InfoRow label="Mode" value={data.payment_mode} />
                  )}
                  {data.wire_transfer_method && (
                    <InfoRow label="Method" value={data.wire_transfer_method} />
                  )}
                  {data.payment_request_date && (
                    <InfoRow
                      label="Req Date"
                      value={data.payment_request_date}
                    />
                  )}

                  {/* Links */}
                  <Box sx={{ mt: 0.5 }}>
                    {Array.isArray(data.url) &&
                      data.url.map((u, i) => (
                        <Link
                          key={i}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{ display: "block", color: "primary.main" }}
                        >
                          View Invoice {data.url.length > 1 ? i + 1 : ""}
                        </Link>
                      ))}
                    {Array.isArray(data.payment_recipt) &&
                      data.payment_recipt.map((u, i) => (
                        <Link
                          key={i}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="caption"
                          sx={{ display: "block", color: "secondary.main" }}
                        >
                          View Receipt{" "}
                          {data.payment_recipt.length > 1 ? i + 1 : ""}
                        </Link>
                      ))}
                  </Box>
                </Box>
              );
            }

            // Render simple link (legacy or other sections)
            // Handle both string items and object items {name, url}
            const url = typeof item === "string" ? item : item.url;
            const name =
              typeof item === "string" ? `${title} ${index + 1}` : item.name;

            if (!url) return null;

            return (
              <Link
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                underline="hover"
                sx={{
                  display: "block",
                  color: "primary.main",
                  wordBreak: "break-all",
                }}
              >
                {name}
              </Link>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};

const InfoRow = ({ label, value }) => (
  <Typography variant="caption" display="block" sx={{ fontSize: "0.7rem" }}>
    <b>{label}:</b> {value}
  </Typography>
);

const StatusTag = ({ label, color }) => {
  const colors = {
    warning: "#ed6c02",
    success: "#2e7d32",
    info: "#0288d1",
    default: "#757575",
  };
  return (
    <span
      style={{
        fontSize: "0.65rem",
        padding: "1px 4px",
        borderRadius: "4px",
        backgroundColor: colors[color] || colors.default,
        color: "white",
      }}
    >
      {label}
    </span>
  );
};

export default InvoiceDisplay;
