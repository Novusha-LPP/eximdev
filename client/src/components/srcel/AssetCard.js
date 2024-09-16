import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CardActions,
} from "@mui/material";
import { styled } from "@mui/system";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LocationOnIcon from "@mui/icons-material/LocationOn";

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(10px)",
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0 8px 12px rgba(0, 0, 0, 0.2)",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  backdropFilter: "blur(5px)",
  borderRadius: theme.shape.borderRadius,
  transition: "all 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.05)",
    background: "linear-gradient(45deg, #111B21 30%, #2A7D7B 90%)",
  },
}));

const AssetCard = ({ asset, onUnlockClick, onLocationClick }) => {
  return (
    <GlassCard>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom color="white">
          Asset ID: {asset.FAssetID}
        </Typography>
        <Typography color="white">SR E-LOCK GUID: {asset.FGUID}</Typography>
        <Typography color="white">Agent Name: {asset.FAgentName}</Typography>
        <Typography color="white">Type: {asset.FAssetTypeName}</Typography>
        <Typography color="white">Status: {asset.FAssetStatusName}</Typography>
        <Typography color="white">
          Last Update: {new Date(asset.FLastUpdateTime).toLocaleString()}
        </Typography>
      </CardContent>
      <CardActions>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <StyledButton
            variant="contained"
            color="primary"
            onClick={() => onUnlockClick(asset)}
            // sx={{
            //   background: "linear-gradient(45deg, #111B21 30%, #2A7D7B 90%)",
            // }}
            sx={{
              background: "#2A7D7B",
            }}
            startIcon={<LockOpenIcon />}
          >
            Unlock
          </StyledButton>
          <StyledButton
            variant="contained"
            color="secondary"
            onClick={() => onLocationClick(asset)}
            startIcon={<LocationOnIcon />}
          >
            Location
          </StyledButton>
        </Box>
      </CardActions>
    </GlassCard>
  );
};

export default AssetCard;
