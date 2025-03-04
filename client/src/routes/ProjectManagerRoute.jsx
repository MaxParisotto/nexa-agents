
import React from 'react';
import { Box, Typography, Paper, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';

import ProjectManagerAgent from '../components/project-manager/ProjectManagerAgent';

/**
 * Project Manager Route Component
 */
export default function ProjectManagerRoute() {
  return (
    <Box>
      {/* Breadcrumbs navigation */}
      <Paper sx={{ p: 1, mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center' }}
            color="inherit"
            component={RouterLink}
            to="/"
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BuildIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            <Typography color="text.primary">Project Manager</Typography>
          </Box>
        </Breadcrumbs>
      </Paper>
      
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>Project Manager</Typography>
        <Typography variant="body1" color="textSecondary">
          Manage projects, tasks, and resources with the help of an AI-powered project management assistant.
        </Typography>
      </Box>
      
      {/* Project Manager Agent Component */}
      <ProjectManagerAgent />
    </Box>
  );
}
