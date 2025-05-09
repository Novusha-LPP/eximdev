import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import BuildIcon from "@mui/icons-material/Build";

const UtilityParent = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          my: 6,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Import Tools & Utilities
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" mb={4}>
          Choose a tool below to assist with your import processes.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 4,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 2,
              borderRadius: 4,
              width: isSmallScreen ? "100%" : 240,
              textAlign: "center",
              transition: "transform 0.3s, box-shadow 0.3s",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/import-utility-tool")}
          >
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<BuildIcon />}
              sx={{
                py: 1.5,
                fontSize: "1.1rem",
                borderRadius: 2,
              }}
            >
              Utility Tool
            </Button>
          </Paper>

          <Paper
            elevation={4}
            sx={{
              p: 2,
              borderRadius: 4,
              width: isSmallScreen ? "100%" : 240,
              textAlign: "center",
              transition: "transform 0.3s, box-shadow 0.3s",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: 6,
              },
            }}
            onClick={() => navigate("/duty-calculator")}
          >
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<CalculateIcon />}
              sx={{
                py: 1.5,
                fontSize: "1.1rem",
                borderRadius: 2,
              }}
            >
              Duty Calculator
            </Button>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default UtilityParent;
