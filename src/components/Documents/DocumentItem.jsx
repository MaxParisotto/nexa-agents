import React from 'react';
import { 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Box, 
  Chip 
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';

const DocumentItem = ({ document, onClick, selected }) => {
  return (
    <ListItem 
      component="div" 
      onClick={onClick} 
      selected={selected}
      sx={{ borderRadius: 1, mb: 0.5, cursor: 'pointer' }}
    >
      <ListItemAvatar>
        <Avatar>
          <DescriptionIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={document.title}
        // Fix: Change component prop to span to avoid using p tag
        secondary={
          <Typography component="span" variant="body2" color="textSecondary">
            {document.description}
            <Box component="span" sx={{ ml: 1, display: 'inline-block' }}>
              <Chip 
                label={document.status || 'active'} 
                size="small" 
                color="success"
                sx={{ height: 20 }} 
              />
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default DocumentItem;
