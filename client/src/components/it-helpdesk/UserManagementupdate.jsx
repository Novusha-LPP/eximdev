import React, { useEffect, useState } from "react";
import { userAPI } from "../../api/userAPI";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  TextField,
  Box,
  Chip,
} from "@mui/material";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    role: "User",
  });

  const fetchUsers = async () => {
    const res = await userAPI.getAll();
    setUsers(res.data.data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    await userAPI.create(form);
    setForm({ first_name: "", last_name: "", username: "", email: "", role: "User" });
    fetchUsers();
  };

  return (
    <Box p={3}>
      <h2>User Management</h2>

      <Box display="flex" gap={2} mb={2}>
        <TextField label="First Name" value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })} />

        <TextField label="Last Name" value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })} />

        <TextField label="Username" value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })} />

        <TextField label="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <Button variant="contained" onClick={handleCreate}>
          Add User
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Username</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {users.map((u) => (
            <TableRow key={u._id}>
              <TableCell>{u.first_name} {u.last_name}</TableCell>
              <TableCell>{u.username}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.role}</TableCell>
              <TableCell>
                <Chip
                  label={u.is_active ? "Active" : "Inactive"}
                  color={u.is_active ? "success" : "error"}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}