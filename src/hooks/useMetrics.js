import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useSocket } from '../services/socket-service';

/**
 * Custom hook for managing system metrics
 * @returns {Object} Metrics data and functions
 */
export function useMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [historicalMetrics, setHistoricalMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { socket, connected } = useSocket();
  
  /**
   * Fetch current system metrics
   */
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // For demo purposes, use mocked data since API isn't available
      // In production, use: const response = await apiService.getSystemMetrics();
      
      // Mock system metrics
      const mockMetrics = {
        cpu_usage: Math.random() * 70 + 10, // Random CPU usage between 10% and 80%
        memory_used: Math.random() * 8 * 1024 * 1024 * 1024, // Random memory usage up to 8GB
        memory_total: 16 * 1024 * 1024 * 1024, // 16GB total memory
        uptime: Math.floor(Math.random() * 604800), // Random uptime up to 1 week
        processes: Math.floor(Math.random() * 20) + 10, // Random number of processes
        temperature: Math.random() * 20 + 40, // Random temperature in Celsius
        disk_usage: {
          used: Math.random() * 200 * 1024 * 1024 * 1024, // Random disk usage up to 200GB
          total: 500 * 1024 * 1024 * 1024, // 500GB total disk space
        },
      };
      
      setMetrics(mockMetrics);
      
      // Add to historical data with timestamp
      setHistoricalMetrics(prev => {
        const newData = [...prev, { 
          ...mockMetrics, 
          timestamp: new Date().getTime() 
        }];
        
        // Keep last 100 data points to prevent memory issues
        return newData.slice(-100);
      });
      
      setError(null);
      return mockMetrics;
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load system metrics.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Fetch historical metrics
   */
  const fetchHistoricalMetrics = useCallback(async (days = 1) => {
    setLoading(true);
    try {
      // In production, use:
      // const response = await apiService.getHistoricalMetrics(days);
      
      // Generate mock historical data
      const mockHistorical = [];
      const now = new Date().getTime();
      const interval = days <= 1 ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5 min for 1 day, 30 min otherwise
      const points = days <= 1 ? 288 : 48 * days; // 288 points per day (5 min intervals)
      
      for (let i = points; i >= 0; i--) {
        const timestamp = now - (i * interval);
        mockHistorical.push({
          timestamp,
          cpu_usage: Math.random() * 70 + 10,
          memory_used: Math.random() * 8 * 1024 * 1024 * 1024,
          memory_total: 16 * 1024 * 1024 * 1024,
          uptime: Math.floor(Math.random() * 604800),
          processes: Math.floor(Math.random() * 20) + 10,
          temperature: Math.random() * 20 + 40,
          disk_usage: {
            used: Math.random() * 200 * 1024 * 1024 * 1024,
            total: 500 * 1024 * 1024 * 1024,
          },
        });
      }
      
      setHistoricalMetrics(mockHistorical);
      setError(null);
      return mockHistorical;
    } catch (err) {
      console.error('Error fetching historical metrics:', err);
      setError('Failed to load historical metrics.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Listen for metrics updates via socket
  useEffect(() => {
    if (!socket || !connected) return;
    
    const handleMetricsUpdate = (updatedMetrics) => {
      setMetrics(updatedMetrics);
      
      // Add to historical data
      setHistoricalMetrics(prev => {
        const newData = [...prev, { 
          ...updatedMetrics, 
          timestamp: new Date().getTime() 
        }];
        return newData.slice(-100);
      });
    };
    
    socket.on('metrics_update', handleMetricsUpdate);
    
    return () => {
      socket.off('metrics_update', handleMetricsUpdate);
    };
  }, [socket, connected]);
  
  // Fetch metrics on initial load
  useEffect(() => {
    fetchMetrics();
    fetchHistoricalMetrics(1); // Fetch 1 day of data initially
    
    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchMetrics();
    }, 10000); // Fetch every 10 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchMetrics, fetchHistoricalMetrics]);
  
  return {
    metrics,
    historicalMetrics,
    loading,
    error,
    fetchMetrics,
    fetchHistoricalMetrics
  };
}

export default useMetrics;
