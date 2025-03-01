import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

const AgentManager = ({ agents, loading, error }) => {
  return (
    <Paper elevation={2} sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Active Agents
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Active</TableCell>
              <TableCell>Server</TableCell>
              <TableCell>Functions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agents?.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>{agent.name}</TableCell>
                <TableCell>{agent.config.model}</TableCell>
                <TableCell>{agent.status}</TableCell>
                <TableCell>{new Date(agent.lastActive).toLocaleString()}</TableCell>
                <TableCell>{agent.config.llmServer}</TableCell>
                <TableCell>{agent.config.functions.length}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default AgentManager;
