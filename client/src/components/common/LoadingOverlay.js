import React from 'react';
import { Box, Typography, Fade, CircularProgress } from '@mui/material';

const LoadingOverlay = ({ isVisible, message = "Getting things ready..." }) => {
    return (
        <Fade in={isVisible} timeout={300} unmountOnExit>
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)', // For Safari support
                    transition: 'all 0.3s ease-in-out',
                }}
            >
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="0" height="0">
                        <defs>
                            <linearGradient id="premiumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1a202c" />
                                <stop offset="50%" stopColor="#4a5568" />
                                <stop offset="100%" stopColor="#2d3748" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <CircularProgress
                        size={60}
                        thickness={4}
                        sx={{
                            'svg circle': { stroke: 'url(#premiumGradient)' },
                        }}
                    />
                </div>

                <Typography
                    variant="h6"
                    sx={{
                        mt: 3,
                        fontWeight: 600,
                        color: '#2d3748',
                        letterSpacing: '0.5px',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                            '0%': { opacity: 0.6 },
                            '50%': { opacity: 1 },
                            '100%': { opacity: 0.6 },
                        }
                    }}
                >
                    {message}
                </Typography>
            </Box>
        </Fade>
    );
};

export default LoadingOverlay;
