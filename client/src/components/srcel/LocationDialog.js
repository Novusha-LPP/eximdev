import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { styled } from "@mui/system";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import truckIcon from "../../assets/images/truckLong.svg"; // Make sure to add this image to your project

const GlassDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: theme.shape.borderRadius,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
}));

const customIcon = L.icon({
  iconUrl: truckIcon,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

const LocationDialog = ({ open, onClose, locationData }) => {
  return (
    <GlassDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ color: "white" }}>Real-time Location Data</DialogTitle>
      <DialogContent>
        {locationData && (
          <>
            <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
              Asset Details:
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Asset ID: {locationData.FAssetID}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Vehicle Name: {locationData.FVehicleName}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Last GPS Time: {new Date(locationData.FGPSTime).toLocaleString()}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Speed: {locationData.FSpeed} km/h
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Battery: {locationData.FBattery}%
            </Typography>

            <Box sx={{ height: "400px", width: "100%", mt: 2 }}>
              <MapContainer
                center={[locationData.FLatitude, locationData.FLongitude]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker
                  position={[locationData.FLatitude, locationData.FLongitude]}
                  icon={customIcon}
                >
                  <Popup>
                    Asset ID: {locationData.FAssetID}
                    <br />
                    Last Update:{" "}
                    {new Date(locationData.FGPSTime).toLocaleString()}
                  </Popup>
                </Marker>
              </MapContainer>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" sx={{ color: "white" }}>
          Close
        </Button>
      </DialogActions>
    </GlassDialog>
  );
};

export default LocationDialog;
