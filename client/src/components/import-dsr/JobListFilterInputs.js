import React, { useEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";

// Text typed into these inputs stays local; the job list is told after a short pause (or at once
// on an explicit action). Each keystroke used to re-render the whole job table, and every keystroke
// in the importer box also started a search request. The values the list finally receives are the same.

const SEARCH_COMMIT_DELAY_MS = 150;
const IMPORTER_COMMIT_DELAY_MS = 300;

function useDeferredValue(value, onCommit, delayMs) {
  const [text, setText] = useState(value || "");
  const lastCommittedRef = useRef(value || "");
  const timerRef = useRef(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Follow changes made elsewhere (e.g. filters reset when the page opens)
  useEffect(() => {
    const incoming = value || "";
    if (incoming !== lastCommittedRef.current) {
      lastCommittedRef.current = incoming;
      clearTimeout(timerRef.current);
      setText(incoming);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const commit = (next) => {
    clearTimeout(timerRef.current);
    setText(next);
    lastCommittedRef.current = next;
    onCommitRef.current(next);
  };

  const change = (next) => {
    setText(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(next), delayMs);
  };

  return { text, change, commit };
}

export function JobSearchBox({ value, onCommit, sx }) {
  const { text, change, commit } = useDeferredValue(value, onCommit, SEARCH_COMMIT_DELAY_MS);
  return (
    <TextField
      value={text}
      onChange={(e) => change(e.target.value)}
      placeholder="Search by Job No, Importer, or AWB/BL Number"
      size="small"
      variant="outlined"
      sx={sx}
      InputProps={{
        endAdornment: (
          <IconButton size="small" onClick={() => commit(text)}>
            <SearchIcon fontSize="small" />
          </IconButton>
        ),
      }}
    />
  );
}

export function ImporterFilter({ value, options, onCommit, sx }) {
  const { text, change, commit } = useDeferredValue(value, onCommit, IMPORTER_COMMIT_DELAY_MS);
  return (
    <Autocomplete
      sx={sx}
      freeSolo
      options={options}
      value={value || ""}
      inputValue={text}
      onInputChange={(e, nextText, reason) => {
        // Typing waits for a pause; picking an option or clearing applies at once
        if (reason === "input") change(nextText);
        else commit(nextText);
      }}
      renderInput={(params) => (
        <TextField {...params} variant="outlined" size="small" fullWidth label="Select Importer" />
      )}
    />
  );
}
