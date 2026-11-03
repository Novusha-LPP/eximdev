import React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { DO_PLANNING_STYLE, getJobStatusStyle } from "../../utils/jobStatusStyle";

// Status filter drop-down: the same options and the same value as before, with the colour each
// status has in the list shown as a dot next to its name.
const dotColor = (option) => {
  if (!option || option.value === "all") return null;
  if (option.value === "DO Planning") return DO_PLANNING_STYLE.bar;
  return getJobStatusStyle(option.value).bar;
};

const StatusLabel = ({ option }) => {
  const color = dotColor(option);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {color && (
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 0 2px ${color}40`,
            flex: "none",
          }}
        />
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {option ? option.name : ""}
      </span>
    </span>
  );
};

export default function StatusFilterSelect({ value, onChange, options, sx }) {
  const byValue = (v) => options.find((o) => o.value === v);
  return (
    <TextField
      select
      size="small"
      variant="outlined"
      label="Status"
      value={value}
      onChange={onChange}
      className="job-status-select"
      sx={sx}
      SelectProps={{
        renderValue: (v) => <StatusLabel option={byValue(v)} />,
        MenuProps: {
          className: "jl-popup",
          PaperProps: {
            sx: {
              mt: 0.5,
              borderRadius: "12px",
              maxHeight: 380,
              boxShadow: "0 10px 30px -8px rgba(15,23,42,.22), 0 2px 8px rgba(15,23,42,.06)",
              "& .MuiMenuItem-root": { fontSize: 13, fontWeight: 600, borderRadius: "8px", mx: 0.75, my: 0.1 },
              "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "#eef3ff", color: "#1e40af" },
            },
          },
        },
      }}
    >
      {options.map((o, i) => (
        <MenuItem key={`status-${o.id || o.value || i}`} value={o.value}>
          <StatusLabel option={o} />
        </MenuItem>
      ))}
    </TextField>
  );
}
