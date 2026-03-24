import React, { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnchor } from "@fortawesome/free-solid-svg-icons";
import ContainerTrackDialog from './ContainerTrackDialog';

export default function ContainerTrackButton({ customHouse, containerNo }) {
  const [open, setOpen] = useState(false);

  if (!customHouse?.toUpperCase().includes("ICD KHODIYAR")) {
    return null;
  }

  const handleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <React.Fragment>
      <Tooltip title="Track on CONCOR India">
        <IconButton
          size="small"
          onClick={handleOpen}
          style={{ padding: 0, marginLeft: 4, marginRight: 4 }}
        >
          <FontAwesomeIcon icon={faAnchor} style={{ fontSize: 12, color: "#7c3aed" }} />
        </IconButton>
      </Tooltip>
      <ContainerTrackDialog 
        open={open} 
        onClose={() => setOpen(false)} 
        containers={[containerNo]} 
      />
    </React.Fragment>
  );
}
