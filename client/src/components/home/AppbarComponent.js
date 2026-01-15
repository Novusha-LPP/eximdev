import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography, FormControl, Select, MenuItem } from "@mui/material";
import { useContext } from "react";
import { BranchContext } from "../../contexts/BranchContext";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();
  const { selectedBranch, setSelectedBranch } = useContext(BranchContext);
  const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
  const isAdmin = user.role === "Admin";

  return (
    <>
      <style>
        {`
          .kite-flag {
            height: 20px;
            margin-left: 6px;
            opacity: 0.85;
            animation: kiteFloat 2.8s ease-in-out infinite;
          }

          @keyframes kiteFloat {
            0% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-4px);
            }
            100% {
              transform: translateY(0);
            }
          }

          .festive-text {
            background: linear-gradient(90deg, 
              #ea0505ff, 
              #1c0404ff, 
              #058209ff, 
              #02325aff, 
              #5f046fff, 
              #730808ff);
            background-size: 400% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: festiveShine 4s linear infinite, gentleFloat 3s ease-in-out infinite;
            font-weight: 700;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            letter-spacing: 0.5px;
            padding: 4px 16px;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
            white-space: nowrap;
          }

          .festive-text::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(90deg, 
              transparent, 
              rgba(255, 255, 255, 0.8), 
              transparent);
            background-size: 200% 100%;
            border-radius: 22px;
            animation: shimmer 3s infinite;
            z-index: -1;
          }

          @keyframes festiveShine {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 400% 50%;
            }
          }

          @keyframes gentleFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-3px);
            }
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          .sparkle {
            position: absolute;
            width: 6px;
            height: 6px;
            background: #FFD700;
            border-radius: 50%;
            animation: sparklePop 1.5s infinite;
            opacity: 0;
            z-index: 1;
          }

          @keyframes sparklePop {
            0%, 100% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }

          .confetti {
            position: absolute;
            width: 8px;
            height: 12px;
            animation: confettiFall 5s linear infinite;
            opacity: 0.8;
            z-index: 1;
          }

          @keyframes confettiFall {
            0% {
              transform: translateY(-100px) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }


        `}
      </style>

      {/* Animated background elements */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1
      }}>
        {/* Sparkles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <Box
            key={`sparkle-${i}`}
            className="sparkle"
            sx={{
              left: `${(i * 12.5)}%`,
              top: `${20 + (i % 3) * 15}px`,
              animationDelay: `${i * 0.3}s`,
              background: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6B6B' : '#2196F3'
            }}
          />
        ))}

        {/* Confetti */}
        {Array.from({ length: 12 }).map((_, i) => (
          <Box
            key={`confetti-${i}`}
            className="confetti"
            sx={{
              left: `${(i * 8.33)}%`,
              top: '-20px',
              animationDelay: `${i * 0.5}s`,
              background: i % 4 === 0 ? '#FF5252' :
                i % 4 === 1 ? '#4CAF50' :
                  i % 4 === 2 ? '#2196F3' : '#FF9800',
              transform: `rotate(${i * 30}deg)`
            }}
          />
        ))}
      </Box>

        {/* Branch Selector and Version */}
        {isAdmin && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <FormControl
              size="small"
              sx={{
                minWidth: 240,
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              }}
            >
              <Select
                value={selectedBranch || "AHMEDABAD HO"}
                onChange={(e) => setSelectedBranch(e.target.value)}
                autoWidth={false}
                renderValue={(value) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.1rem' }}>
                      {value === "AHMEDABAD HO" ? "🏢" : "🏭"}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#1e293b",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                )}
                sx={{
                  height: "42px",
                  borderRadius: "12px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0,0,0,0.12)",
                    borderWidth: "1px",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                    borderWidth: "2px",
                  },
                }}
              >
                <MenuItem value="AHMEDABAD HO" sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.2rem' }}>🏢</Box>
                    <Typography sx={{ fontWeight: 600 }}>AHMEDABAD HO</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="GANDHIDHAM" sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.2rem' }}>🏭</Box>
                    <Typography sx={{ fontWeight: 600 }}>GANDHIDHAM</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              borderLeft: "2px solid rgba(99, 102, 241, 0.2)",
              pl: 2.5
            }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontSize: "0.6rem"
                }}
              >
                System Version
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  color: "#4f46e5",
                  lineHeight: 1.1,
                  fontSize: "0.9rem"
                }}
              >
                v{process.env.REACT_APP_VERSION}
              </Typography>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          background: "linear-gradient(90deg, #fde6d8 0%, #fff4ea 30%, #f8fbff 55%, #eaf4ff 75%, #dbeafe 100%)",
          backdropFilter: "blur(6px) !important",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.3)",
          overflow: 'hidden',
          zIndex: 2
        }}
      >
        <Toolbar sx={{
          position: 'relative',
          justifyContent: 'space-between',
          minHeight: '64px !important',
          px: { xs: 1, sm: 2 }
        }}>
          {/* Left section: Menu + Back + Logo */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 0
          }}>
            {/* Mobile Menu */}
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => props.setMobileOpen(!props.mobileOpen)}
              sx={{ mr: { xs: 1, sm: 2 }, display: { lg: "none" } }}
            >
              <MenuIcon sx={{ color: "#000" }} />
            </IconButton>

            {/* Back Button */}
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => window.history.back()}
              sx={{ mr: 1, display: { xs: 'none', sm: 'flex' } }}
            >
              <ArrowBackIcon sx={{ color: "#000" }} />
            </IconButton>

            {/* LOGO + KITE FLAG */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                minWidth: 0
              }}
              onClick={() => navigate("/")}
            >
              <img
                src={require("../../assets/images/logo.webp")}
                alt="logo"
                height="40px"
                style={{ maxWidth: '100%' }}
              />

              {/* Kite as Flag */}
              <img
                src="https://images.emojiterra.com/google/noto-emoji/animated-emoji/1fa81.gif"
                alt="Uttarayan Kite"
                className="kite-flag"
                style={{ flexShrink: 0 }}
              />
            </Box>
          </Box>

          {/* Center section: Festive Message */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 2,
              minWidth: 0,
              px: 2
            }}
          >
            {/* GIF Kite - Left */}
            <img
              src="https://images.emojiterra.com/google/noto-emoji/animated-emoji/1fa81.gif"
              alt="Uttarayan Kite"
              style={{
                height: '40px',
                width: '40px',
                transform: 'scaleX(-1)', // Flip to face text
                marginRight: '8px'
              }}
            />

            {/* Festive Message */}
            <Typography
              variant="h6"
              className="festive-text"
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1rem' },
                textAlign: 'center',
                flexShrink: 0
              }}
            >
              Wishing you a joyful and prosperous Uttrayan !!!
            </Typography>

            {/* GIF Kite - Right */}
            <img
              src="https://images.emojiterra.com/google/noto-emoji/animated-emoji/1fa81.gif"
              alt="Uttarayan Kite"
              style={{
                height: '40px',
                width: '40px',
                marginLeft: '8px'
              }}
            />
          </Box>

          {/* Right section: Version */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            flex: 1,
            minWidth: 0
          }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "#000",
                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                whiteSpace: 'nowrap',
                fontSize: { xs: '0.7rem', sm: '0.8rem' }
              }}
            >
              V:{process.env.REACT_APP_VERSION}
            </Typography>
          </Box>

        </Toolbar>
      </AppBar>
    </>
  );
}

export default AppbarComponent;