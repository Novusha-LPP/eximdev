import React, { useEffect, useState } from "react";
import axios from "axios";
import { TextField, MenuItem } from "@mui/material";
import AssignModule from "./AssignModule";
import AssignRole from "./AssignRole/AssignRole";
import Autocomplete from "@mui/material/Autocomplete";
import ChangePasswordByAdmin from "./AssignRole/ChangePasswordByAdmin";
import SelectIcdCode from "./AssignRole/SelectIcdCode";

function Assign() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [masterType, setMasterType] = useState("Assign Module");

  const handleMasterChange = (e) => {
    setMasterType(e.target.value);
  };

  useEffect(() => {
    async function getUsers() {
      try {
        const res = await axios(
          `${process.env.REACT_APP_API_STRING}/get-all-users`
        );
        setUserList(res.data.map((user) => user.username));
      } catch (error) {
        console.error("Error fetching user list:", error);
      }
    }

    getUsers();
    // eslint-disable-next-line
  }, [selectedUser]);

  const masterComponent = () => {
    switch (masterType) {
      case "Assign Module":
        return <AssignModule selectedUser={selectedUser} />;
      case "Assign Role":
        return <AssignRole selectedUser={selectedUser} />;
      case "Change Password":
        return <ChangePasswordByAdmin selectedUser={selectedUser} />;
      case "Select ICD Code":
        return <SelectIcdCode selectedUser={selectedUser} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex-div" style={{ marginTop: "20px" }}>
        <div style={{ flex: 1 }}>
          <Autocomplete
            value={selectedUser}
            onChange={(event, newValue) => {
              setSelectedUser(newValue);
            }}
            options={userList}
            getOptionLabel={(option) => option}
            sx={{ width: 200, marginBottom: "20px" }}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Select User" />
            )}
          />
        </div>
        <TextField
          select
          size="small"
          label={!selectedUser ? "First select user" : "Select"}
          sx={{ width: "200px", marginBottom: "20px" }}
          value={masterType}
          onChange={handleMasterChange}
          disabled={!selectedUser} // Disable if no user is selected
        >
          <MenuItem value="Assign Module">Assign Module</MenuItem>
          <MenuItem value="Assign Role">Assign Role</MenuItem>
          <MenuItem value="Change Password">Change Password</MenuItem>
          <MenuItem value="Select ICD Code">Assign ICD Code</MenuItem>
        </TextField>
      </div>

      {masterComponent()}
    </>
  );
}

export default React.memo(Assign);
