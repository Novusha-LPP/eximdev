import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import { TextField } from "@mui/material";
import axios from "axios";
import Autocomplete from "@mui/material/Autocomplete";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import ListItemText from "@mui/material/ListItemText";
import Select from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const AssignJobsForm = (props) => {
  const users = props.usernames?.map((username, index) => ({
    username,
    jobsCount: props.counts[index],
  }));

  const [importerData, setImporterData] = useState([]);
  const [assignedImporters, setAssignedImporters] = useState([]);

  useEffect(() => {
    async function getImporterList() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/importer-list-to-assign-jobs`
      );
      setImporterData(res.data);
    }

    getImporterList();
    // eslint-disable-next-line
  }, []);

  const userList = users?.map(
    (user) => `${user.username}: Pending Jobs- ${user.jobsCount}`
  );

  const formik = useFormik({
    initialValues: {
      user: null,
    },
    // validationSchema,
    onSubmit: async (values, { resetForm }) => {
      const data = {
        username: values.user.split(":")[0].trim(),
        importers: assignedImporters?.map((importer) => ({
          importer: importer,
          importerURL: importer
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/\./g, "")
            .replace(/\//g, "_")
            .replace(/-/g, "")
            .replace(/_+/g, "_")
            .replace(/\(/g, "")
            .replace(/\)/g, "")
            .replace(/\[/g, "")
            .replace(/\]/g, "")
            .replace(/,/g, ""),
        })),
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/assign-jobs`,
        data
      );
      alert(res.data.message);
      resetForm();
      props.handleClose();
    },
  });

  const handleChangeUserAutocomplete = (event, value) => {
    formik.setFieldValue("user", value);
  };

  const handleChange = (event) => {
    setAssignedImporters(event.target.value);
  };

  return (
    <form onSubmit={formik.handleSubmit}>
      <Autocomplete
        disablePortal
        options={userList}
        getOptionLabel={(option) => option}
        width="100%"
        renderInput={(params) => (
          <TextField
            {...params}
            label="Select user"
            error={formik.touched.user && Boolean(formik.errors.user)}
            helperText={formik.touched.user && formik.errors.user}
          />
        )}
        id="user"
        name="user"
        onChange={handleChangeUserAutocomplete}
        value={formik.values.user}
        style={{ marginBottom: "15px" }}
      />

      <FormControl sx={{ width: "100%", height: "55px" }}>
        <InputLabel
          id="demo-multiple-checkbox-label"
          className="assign-jobs-select"
          sx={{ backgroundColor: "#fff", paddingRight: "10px" }}
        >
          Select Importer
        </InputLabel>
        <Select
          labelId="demo-multiple-checkbox-label"
          multiple
          value={assignedImporters}
          input={<OutlinedInput label="Tag" />}
          renderValue={(selected) => selected.join(", ")}
          MenuProps={MenuProps}
          id="importer"
          name="importer"
          onChange={handleChange}
          sx={{ height: "55px" }}
        >
          {importerData?.map((name) => (
            <MenuItem key={name} value={name}>
              <Checkbox checked={assignedImporters.indexOf(name) > -1} />
              <ListItemText primary={name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <button type="submit" className="btn">
        Assign
      </button>
    </form>
  );
};

export default AssignJobsForm;
