import React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";

// A single-choice field shown as a drop-down. It takes the same props and the same
// <FormControlLabel value label control /> children a RadioGroup took, so the value,
// the change handler and the options stay exactly as they were.
const textOf = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
};

const optionsOf = (children) =>
  React.Children.toArray(children)
    .filter((child) => child?.props && "value" in child.props)
    .map((child) => ({
      value: child.props.value,
      label: textOf(child.props.label),
      disabled: Boolean(child.props.disabled || child.props.control?.props?.disabled),
      color: child.props.control?.props?.style?.color,
    }));

const Dot = ({ color }) =>
  color && color !== "inherit" ? (
    <span
      aria-hidden="true"
      style={{ width: 9, height: 9, borderRadius: "50%", background: color, marginRight: 8, flex: "none", display: "inline-block" }}
    />
  ) : null;

export default function ChoiceSelect({ name, value, onChange, disabled, children, placeholder = "Select", minWidth = 160 }) {
  const options = optionsOf(children);
  const current = value ?? "";
  const selected = options.find((o) => o.value === current);
  return (
    <TextField
      select
      size="small"
      variant="outlined"
      name={name}
      value={selected ? current : ""}
      onChange={onChange}
      disabled={disabled}
      className="jd-choice"
      sx={{ minWidth }}
      SelectProps={{
        displayEmpty: true,
        MenuProps: { className: "jl-popup" },
        renderValue: () =>
          selected ? (
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <Dot color={selected.color} />
              {selected.label}
            </span>
          ) : (
            <span style={{ color: "#8793a8" }}>{placeholder}</span>
          ),
      }}
    >
      {options.map((o) => (
        <MenuItem key={String(o.value)} value={o.value} disabled={o.disabled}>
          <Dot color={o.color} />
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
