import React, { useState } from "react";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import CircularProgress from "@mui/material/CircularProgress";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/Close";
import { getTableRowInlineStyle } from "../../utils/getTableRowsClassname";
import { detailedStatusOptions } from "../../assets/data/detailedStatusOptions";

// Readable names for the date each stage is ordered by (field names come from the server)
const DATE_FIELD_LABELS = {
  billing_completed_date: "Billing completed date",
  emptyContainerOffLoadDate: "Empty container off-load date",
  do_completed: "DO completed date",
  detention_from: "Detention start date",
  be_date: "BE date",
  container_rail_out_date: "Rail-out date",
  rail_out: "Rail-out date",
  discharge_date: "Discharge date",
  gateway_igm_date: "Gateway IGM date",
  vessel_berthing: "ETA (vessel berthing) date",
};

// Every status a job can have; "Status Completed" in the filter is another name for "Billed"
const KNOWN_STATUSES = [
  "Billed",
  ...detailedStatusOptions.map((o) => o.value).filter((v) => v !== "all" && v !== "Status Completed"),
];

// Same function that paints the job rows, so the swatches always match the list
const rowColourOf = (status) => getTableRowInlineStyle({ original: { detailed_status: status } }).backgroundColor || "";

const Swatch = ({ color, label }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box
      sx={{
        width: 28,
        height: 16,
        borderRadius: "3px",
        border: "1px solid #cbd5e1",
        backgroundColor: color || "#ffffff",
        flexShrink: 0,
      }}
    />
    <Typography variant="body2">{label || (color ? color : "No colour")}</Typography>
  </Box>
);

// Job number badge colours (rules from ExpandedJobDetails.js)
const URGENCY_RULES = [
  {
    when: "Estimated Time of Arrival",
    rows: [
      ["#ff1111", "Vessel arrives today"],
      ["#f85a5a", "Arrives in 1–2 days"],
      ["#fd8e8e", "Arrives in 3–5 days"],
    ],
  },
  {
    when: "BE Noted, Clearance Pending · PCV Done, Duty Payment Pending · Custom Clearance Completed",
    rows: [
      ["yellow", "Detention starts in 3 days"],
      ["orange", "Detention starts in 2 days"],
      ["red", "Detention starts tomorrow"],
      ["darkred", "Detention has started"],
    ],
  },
  {
    when: "Billing Pending (FCL: empty container off-load date · LCL: delivery date)",
    rows: [
      ["orange", "6–10 days ago"],
      ["red", "More than 10 days ago"],
    ],
  },
];

export default function JobColorOrderHelp() {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [open, setOpen] = useState(false);
  const [legend, setLegend] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (legend) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/jobs/status-legend`);
      setLegend(res.data);
      setLoadFailed(false);
    } catch (err) {
      console.error("Could not load status order:", err);
      setLoadFailed(true);
    }
  };

  // Ranked stages in list order, then statuses without a rank (listed after all ranked ones)
  const ranked = legend?.ranked || [];
  const rankedNames = new Set(ranked.map((r) => r.status));
  const others = KNOWN_STATUSES.filter((s) => !rankedNames.has(s));
  const stages = [
    ...ranked.map((r) => ({ status: r.status, orderBy: DATE_FIELD_LABELS[r.dateField] || r.dateField })),
    ...others.map((status) => ({ status, orderBy: null })),
  ];

  return (
    <>
      <Tooltip title="How row colours and order work">
        <IconButton size="small" onClick={handleOpen} aria-label="How row colours and order work">
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth fullScreen={isPhone}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
          How row colours and order work
          <IconButton onClick={() => setOpen(false)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Order of jobs
          </Typography>
          <Box component="ol" sx={{ mt: 0, pl: 3, "& li": { mb: 0.5 } }}>
            <li>
              <Typography variant="body2">
                On the page you are viewing, jobs with a client query you have not seen come first, then jobs
                with an open client query.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">Then jobs are listed by stage, in the order of the table below.</Typography>
            </li>
            <li>
              <Typography variant="body2">
                Within a stage, the job with the oldest stage date comes first. The date is taken from the job, or
                from its first container if the job has none. Jobs without that date come last, and jobs with the
                same date stay in the order they were created.
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Clicking the Importer, BL Number, BE Number or Container header sorts the current page by that column
                instead.
              </Typography>
            </li>
          </Box>

          {!legend && !loadFailed && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {loadFailed && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              The stage order could not be loaded. Close this window and try again.
            </Typography>
          )}
          {legend && (
            <Box sx={{ overflowX: "auto", mb: 3 }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status (stage)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Row colour</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Within the stage, ordered by</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stages.map((stage, index) => (
                  <TableRow key={stage.status}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{stage.status}</TableCell>
                    <TableCell>
                      <Swatch color={rowColourOf(stage.status)} />
                    </TableCell>
                    <TableCell>{stage.orderBy || "Order created (listed after all stages above)"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Box>
          )}

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Job number colours (urgency)
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            The job number badge is coloured when a key date is near or has passed. If several containers qualify,
            the last one in the list decides the colour.
          </Typography>
          {URGENCY_RULES.map((rule) => (
            <Box key={rule.when} sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                {rule.when}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                {rule.rows.map(([color, label]) => (
                  <Swatch key={label} color={color} label={label} />
                ))}
              </Box>
            </Box>
          ))}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            A job's status, and so its colour and position, is worked out automatically from its dates whenever the
            job changes.
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
