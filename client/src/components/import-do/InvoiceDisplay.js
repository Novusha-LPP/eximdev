import React from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  ListSubheader,
  InputAdornment,
} from "@mui/material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DescriptionIcon from "@mui/icons-material/Description";
import FileCopyIcon from "@mui/icons-material/FileCopy";

const InvoiceDisplay = ({ row, showOOC = true }) => {
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

  // Invoice sections
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
  ];

  // OOC section
  const oocSection = {
    key: "ooc",
    title: "OOC Copies",
    items: ooc_copies,
    icon: <FileCopyIcon fontSize="small" />,
  };

  const getDropdownOptions = () => {
    const options = [];

    // Invoices
    invoiceSections.forEach((section) => {
      if (section.items && section.items.length > 0) {
        options.push({
          type: "header",
          label: section.title,
          key: section.key,
        });

        section.items.forEach((item, idx) => {
          if (section.isRich && item.type === "rich") {
            const { data, name } = item;
            const status = data.is_draft
              ? " (Draft)"
              : data.is_final
                ? " (Final)"
                : "";

            // Invoices URLs
            if (Array.isArray(data.url)) {
              data.url.forEach((url, i) => {
                options.push({
                  type: "item",
                  label: `${name}${status} - Invoice ${data.url.length > 1 ? i + 1 : ""
                    }`,
                  url: url,
                  key: `${section.key}-${idx}-inv-${i}`,
                  icon: <DescriptionIcon fontSize="small" />,
                });
              });
            }
            // Receipt URLs
            if (Array.isArray(data.payment_recipt)) {
              data.payment_recipt.forEach((url, i) => {
                options.push({
                  type: "item",
                  label: `${name}${status} - Receipt ${data.payment_recipt.length > 1 ? i + 1 : ""
                    }`,
                  url: url,
                  key: `${section.key}-${idx}-rec-${i}`,
                  icon: <ReceiptIcon fontSize="small" />,
                });
              });
            }
          } else {
            // Simple
            const url = typeof item === "string" ? item : item.url;
            const name =
              typeof item === "string"
                ? `${section.title} ${idx + 1}`
                : item.name;
            if (url) {
              options.push({
                type: "item",
                label: name,
                url: url,
                key: `${section.key}-${idx}`,
                icon: section.icon,
              });
            }
          }
        });
      }
    });

    // OOC
    if (showOOC && oocSection.items && oocSection.items.length > 0) {
      options.push({
        type: "header",
        label: oocSection.title,
        key: oocSection.key,
      });
      oocSection.items.forEach((item, idx) => {
        const url = typeof item === "string" ? item : item.url;
        const name = typeof item === "string" ? `OOC Copy ${idx + 1}` : item.name;
        if (url) {
          options.push({
            type: "item",
            label: name,
            url: url,
            key: `ooc-${idx}`,
            icon: oocSection.icon,
          });
        }
      });
    }

    return options;
  };

  const options = getDropdownOptions();

  if (options.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          fontWeight: "800",
          mt: 1.5,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "primary.main",
          fontSize: "0.7rem",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        View Invoices
      </Typography>
      <TextField
        select
        size="small"
        value=""
        onChange={(e) => {
          const url = e.target.value;
          if (url) window.open(url, "_blank");
        }}
        SelectProps={{
          displayEmpty: true,
          renderValue: () => (
            <Typography variant="body2" color="text.secondary">
              Select to view...
            </Typography>
          ),
          MenuProps: {
            PaperProps: {
              elevation: 4,
              sx: {
                borderRadius: 2,
                mt: 1,
                maxHeight: 300,
                "& .MuiListSubheader-root": {
                  bgcolor: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(5px)",
                  lineHeight: "36px",
                  pt: 0.5,
                  pb: 0.5,
                  fontWeight: 700,
                  color: "primary.dark",
                },
              },
            },
            transformOrigin: { horizontal: "left", vertical: "top" },
            anchorOrigin: { horizontal: "left", vertical: "bottom" },
          },
        }}
        sx={{
          minWidth: 150,
          "& .MuiOutlinedInput-root": {
            backgroundColor: "background.paper",
            borderRadius: 1.5,
            transition: "all 0.2s",
            "& fieldset": {
              borderColor: "action.hover", // Subtle border
            },
            "&:hover": {
              backgroundColor: "action.hover",
              "& fieldset": {
                borderColor: "primary.light",
              },
            },
            "&.Mui-focused": {
              backgroundColor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              "& fieldset": {
                borderWidth: 1,
                borderColor: "primary.main",
              },
            },
          },
          "& .MuiSelect-select": {
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 1, // Slightly taller for better touch target
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <ReceiptIcon
                fontSize="small"
                sx={{ color: "primary.main", opacity: 0.8 }}
              />
            </InputAdornment>
          ),
        }}
      >
        <MenuItem value="" disabled sx={{ display: "none" }}>
          Select to view...
        </MenuItem>
        {options.map((opt) => {
          if (opt.type === "header") {
            return (
              <ListSubheader
                key={opt.key}
                sx={{
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {opt.label}
              </ListSubheader>
            );
          }
          return (
            <MenuItem
              key={opt.key}
              value={opt.url}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "action.selected",
                  transform: "translateX(4px)",
                },
                transition: "all 0.2s",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ color: "action.active", display: "flex" }}>{opt.icon}</Box>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {opt.label}
                </Typography>
              </Box>
            </MenuItem>
          );
        })}
      </TextField>
    </Box>
  );
};

export default InvoiceDisplay;