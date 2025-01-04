// src/components/UserImportersBox.js
import React from "react";
import { Box, Avatar, Typography, Grid, Paper } from "@mui/material";
import { styled } from "@mui/material/styles"; // Corrected import
import PropTypes from "prop-types";

// Styled components with defensive checks
const BigBox = styled(Paper)(({ theme }) => ({
  padding: theme?.spacing?.(2) || "16px",
  backgroundColor: "#f5f5f5",
}));

const SmallBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme?.spacing?.(1) || "8px",
  margin: theme?.spacing?.(1) || "8px",
  backgroundColor: "#ffffff",
  borderRadius: theme?.shape?.borderRadius || "4px",
  boxShadow: theme?.shadows?.[1] || "none",
}));

const UserInfo = styled(Box)(({ theme }) => ({
  marginLeft: theme?.spacing?.(2) || "16px",
}));

const CountBadge = styled(Box)(({ theme }) => ({
  marginLeft: "auto",
  backgroundColor: theme?.palette?.primary?.main || "#1976d2",
  color: "#ffffff",
  padding: "4px 8px",
  borderRadius: "12px",
  fontSize: "0.8rem",
}));

const UserImportersBox = ({ users, role, selectedUser }) => {
  if (!role) {
    return (
      <Typography variant="body1" color="textSecondary">
        First select role for {selectedUser}
      </Typography>
    );
  }

  return (
    <BigBox elevation={3}>
      <Typography variant="h6" gutterBottom>
        list of {role}
      </Typography>
      <Grid container spacing={2}>
        {users.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <SmallBox>
              <Avatar src={user.avatar} alt={user.name} />
              <UserInfo>
                <Typography variant="subtitle1">{user.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {user.position}
                </Typography>
              </UserInfo>
              <CountBadge>{user.importersCount}</CountBadge>
            </SmallBox>
          </Grid>
        ))}
      </Grid>
    </BigBox>
  );
};

UserImportersBox.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      position: PropTypes.string.isRequired,
      avatar: PropTypes.string.isRequired,
      importersCount: PropTypes.number.isRequired,
    })
  ).isRequired,
  role: PropTypes.string,
  selectedUser: PropTypes.string,
};

export default UserImportersBox;
