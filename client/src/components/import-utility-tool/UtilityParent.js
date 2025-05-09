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
  Grow,
  Divider,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import BuildIcon from "@mui/icons-material/Build";
import SpeedIcon from "@mui/icons-material/Speed";
import StarIcon from "@mui/icons-material/Star";

const UtilityParent = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const cardStyles = {
    p: 4,
    borderRadius: 4,
    width: isSmallScreen ? "100%" : 300,
    textAlign: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    border: "1px solid rgba(230, 230, 230, 0.7)",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: "0 15px 35px rgba(0,0,0,0.18)",
      border: `1px solid ${theme.palette.primary.light}`,
    },
  };

  const buttonStyles = {
    py: 1.5,
    mt: 2,
    fontSize: "1.1rem",
    fontWeight: "700",
    borderRadius: 3,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    color: "#fff",
    textTransform: "none",
    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
    "&:hover": {
      background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
      boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
    },
  };

  const cardContent = [
    {
      title: "Import Utility Tool",
      description:
        "Streamline your import process with our comprehensive utility toolkit",
      icon: (
        <BuildIcon sx={{ fontSize: 45, color: theme.palette.primary.main }} />
      ),
      path: "/import-utility-tool",
      features: ["Smart validation", "Custom templates", "Batch processing"],
    },
    {
      title: "Import Duty Calculator",
      description: "Calculate import duties and taxes with precision",
      icon: (
        <CalculateIcon
          sx={{ fontSize: 45, color: theme.palette.primary.main }}
        />
      ),
      path: "/duty-calculator",
      features: ["Real-time rates", "Multiple currencies", "Tax breakdown"],
    },
  ];

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 10,
          pb: 8,
          overflow: "hidden",
        }}
      >
        {/* Background elements */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
            opacity: 0.05,
            background: `radial-gradient(circle at 20% 30%, ${theme.palette.primary.light}, transparent 40%),
                      radial-gradient(circle at 80% 70%, ${theme.palette.secondary.light}, transparent 40%)`,
          }}
        />

        <Box sx={{ maxWidth: "800px", textAlign: "center" }}>
          <Typography
            variant="h2"
            fontWeight="800"
            gutterBottom
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Import Tools & Utilities
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            mb={2}
            sx={{ fontWeight: 400, maxWidth: "650px", mx: "auto" }}
          >
            Make your import journey smarter and more efficient with our
            professional suite of tools.
          </Typography>

          <Box
            sx={{ display: "flex", justifyContent: "center", mb: 5, gap: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <SpeedIcon sx={{ mr: 0.8, color: theme.palette.success.main }} />
              <Typography variant="body2" fontWeight={500}>
                Fast Processing
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <StarIcon sx={{ mr: 0.8, color: theme.palette.warning.main }} />
              <Typography variant="body2" fontWeight={500}>
                Highly Accurate
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
            mt: 4,
          }}
        >
          {cardContent.map((card, index) => (
            <Grow in timeout={(index + 1) * 300} key={index}>
              <Paper sx={cardStyles} onClick={() => navigate(card.path)}>
                <Box sx={{ mb: 3 }}>{card.icon}</Box>
                <Typography variant="h5" fontWeight="700" mb={1.5}>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {card.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                  {card.features.map((feature, i) => (
                    <Typography
                      key={i}
                      variant="body2"
                      sx={{
                        py: 0.5,
                        color: "text.secondary",
                        fontWeight: i === 0 ? 600 : 400,
                        color: i === 0 ? theme.palette.primary.main : "inherit",
                      }}
                    >
                      {feature}
                    </Typography>
                  ))}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  startIcon={index === 0 ? <BuildIcon /> : <CalculateIcon />}
                  sx={buttonStyles}
                >
                  Get Started
                </Button>
              </Paper>
            </Grow>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default UtilityParent;
