import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/system";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AssetCard from "./AssetCard.js";
import LocationDialog from "./LocationDialog.js";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import DashboardIcon from "@mui/icons-material/Dashboard";

const GlassContainer = styled(Container)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.8)", // Increase opacity for more solid background
  backdropFilter: "blur(15px)", // Increase blur effect
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)", // Slightly stronger shadow for depth
}));


const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: "#111b21", // Use the primary color of your theme
  backdropFilter: "blur(10px)", // Apply a slight blur
  boxShadow: "none",
}));

// const GradientBackground = styled(Box)({
//   background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
//   minHeight: "100vh",
//   padding: "24px",
// });
const GradientBackground = styled(Box)({
  background: "#F5F5F5", // Light grey or white background for a cleaner look
  minHeight: "100vh",
  padding: "24px",
});

const SRCELDashboard = () => {
  const navigate = useNavigate();
  const [assetList, setAssetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [openLocationDialog, setOpenLocationDialog] = useState(false);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    fetchAssetList();
  }, []);

  const fetchAssetList = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.post(
        "http://icloud.assetscontrols.com:8092/OpenApi/Admin",
        {
          FTokenID: token,
          FAction: "QueryAdminAssetList",
        }
      );

      if (response.data.Result === 200) {
        setAssetList(response.data.FObject);
      } else {
        setError(response.data.Message || "Failed to fetch asset list");
      }
    } catch (error) {
      setError("An error occurred while fetching the asset list");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    navigate("/login");
  };

  const handleUnlockClick = (asset) => {
    setSelectedAsset(asset);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAsset(null);
  };

  const handleConfirmUnlock = async () => {
    const token = localStorage.getItem("token");
    if (!token || !selectedAsset) {
      handleCloseDialog();
      return;
    }

    try {
      const response = await axios.post(
        "http://icloud.assetscontrols.com:8092/OpenApi/Instruction",
        {
          FTokenID: token,
          FAction: "OpenLockControl",
          FAssetGUID: selectedAsset.FGUID,
        }
      );

      if (response.data.Result === 200) {
        alert("Unlock instruction sent successfully");
        fetchAssetList();
      } else {
        alert(response.data.Message || "Failed to send unlock instruction");
      }
    } catch (error) {
      alert("An error occurred while sending the unlock instruction");
    } finally {
      handleCloseDialog();
    }
  };

  const handleLocationClick = async (asset) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await axios.post(
        "http://icloud.assetscontrols.com:8092/OpenApi/LBS",
        {
          FTokenID: token,
          FAction: "QueryLBSMonitorListByFGUIDs",
          FGUIDs: asset.FGUID,
          FType: 2,
        }
      );

      if (response.data.Result === 200 && response.data.FObject.length > 0) {
        setLocationData(response.data.FObject[0]);
        setOpenLocationDialog(true);
      } else {
        alert("Failed to fetch location data");
      }
    } catch (error) {
      alert("An error occurred while fetching location data");
    }
  };

  const handleCloseLocationDialog = () => {
    setOpenLocationDialog(false);
    setLocationData(null);
  };
  if (loading) {
    return (
      <GradientBackground>
        <Typography variant="h4" align="center" sx={{ color: "white", pt: 4 }}>
          Loading...
        </Typography>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <Typography variant="h4" align="center" sx={{ pt: 4 }}>
          {error}
        </Typography>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StyledAppBar position="static">
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GPS Truck Tracking Dashboard
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToAppIcon />
          </IconButton>
        </Toolbar>
      </StyledAppBar>
      <GlassContainer
        maxWidth="lg"
        sx={{
          mt: 4,
          background: "linear-gradient(45deg, #111B21 30%, #2A7D7B 90%)",
          color: "#FFFFFF", // Ensuring the text color contrasts well with the dark background
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom color="white">
          Welcome to your Asset Dashboard
        </Typography>
        <Grid container spacing={3}>
          {assetList.map((asset, index) => (
            <Grid item xs={12} sm={6} md={4} key={asset.FAssetID || index}>
              <AssetCard
                asset={asset}
                onUnlockClick={handleUnlockClick}
                onLocationClick={handleLocationClick}
              />
            </Grid>
          ))}
        </Grid>
      </GlassContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        PaperProps={{
          style: {
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle>{"Confirm Unlock"}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to unlock this asset?
            {selectedAsset && (
              <Box mt={2}>
                <Typography>Asset ID: {selectedAsset.FAssetID}</Typography>
                <Typography>SR E-LOCK GUID: {selectedAsset.FGUID}</Typography>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmUnlock} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <LocationDialog
        open={openLocationDialog}
        onClose={handleCloseLocationDialog}
        locationData={locationData}
      />
    </GradientBackground>
  );
};

export default SRCELDashboard;
