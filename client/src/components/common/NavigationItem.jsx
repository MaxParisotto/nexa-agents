import React from 'react';
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { NavLink } from 'react-router-dom';

/**
 * Navigation Item component for the sidebar navigation
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Item title
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.path - Navigation path
 * @param {Function} [props.onClick] - Optional click handler
 */
export default function NavigationItem({ title, icon, path, onClick }) {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={NavLink}
        to={path}
        onClick={onClick}
        sx={{
          minHeight: 48,
          '&.active': {
            bgcolor: 'action.selected',
          },
        }}
      >
        {icon && <ListItemIcon>{icon}</ListItemIcon>}
        <ListItemText primary={title} />
      </ListItemButton>
    </ListItem>
  );
}
