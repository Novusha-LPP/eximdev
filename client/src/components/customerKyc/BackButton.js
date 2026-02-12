import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
      <ArrowBackIcon />
    </IconButton>
  );
};

export default BackButton;
