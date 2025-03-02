/**
 * ConnectionMonitor - Utility for monitoring and caching connection status
 * Reduces redundant API calls by maintaining a central cache of connection states
 */
class ConnectionMonitor {
  constructor() {
    this.connectionStatus = new Map();
    this.connectionTimestamps = new Map();
    this.statusListeners = new Map();
    this.defaultCheckInterval = 60000; // 1 minute
    this.checkIntervals = {
      'lmStudio': 60000,  // 1 minute
      'ollama': 60000     // 1 minute
    };
  }

  /**
   * Register a service to be monitored
   * @param {string} serviceId - Unique identifier for the service
   * @param {function} checkFn - Function that returns a promise resolving to connection status
   * @param {number} interval - Check interval in ms (optional)
   */
  registerService(serviceId, checkFn, interval = null) {
    if (!this.statusListeners.has(serviceId)) {
      this.statusListeners.set(serviceId, []);
    }
    
    // Set the check interval
    if (interval) {
      this.checkIntervals[serviceId] = interval;
    }
    
    // Store the check function
    this._checkFns = this._checkFns || {};
    this._checkFns[serviceId] = checkFn;
    
    return {
      subscribe: (callback) => this.subscribe(serviceId, callback),
      unsubscribe: (callback) => this.unsubscribe(serviceId, callback),
      getStatus: () => this.getStatus(serviceId),
      checkNow: () => this.checkConnection(serviceId, true)
    };
  }

  /**
   * Subscribe to connection status updates
   */
  subscribe(serviceId, callback) {
    if (!this.statusListeners.has(serviceId)) {
      this.statusListeners.set(serviceId, []);
    }
    
    this.statusListeners.get(serviceId).push(callback);
    
    // If we have cached status, notify immediately
    if (this.connectionStatus.has(serviceId)) {
      setTimeout(() => callback(this.connectionStatus.get(serviceId)), 0);
    }
    
    return () => this.unsubscribe(serviceId, callback);
  }

  /**
   * Unsubscribe from connection status updates
   */
  unsubscribe(serviceId, callback) {
    if (!this.statusListeners.has(serviceId)) return;
    
    const listeners = this.statusListeners.get(serviceId);
    const index = listeners.indexOf(callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Get current connection status (cached)
   */
  getStatus(serviceId) {
    return this.connectionStatus.get(serviceId) || { connected: false, lastChecked: null };
  }

  /**
   * Check if connection should be tested based on time since last check
   */
  shouldCheck(serviceId) {
    const now = Date.now();
    const lastChecked = this.connectionTimestamps.get(serviceId) || 0;
    const interval = this.checkIntervals[serviceId] || this.defaultCheckInterval;
    
    return now - lastChecked >= interval;
  }

  /**
   * Check connection status for a service
   */
  async checkConnection(serviceId, force = false) {
    // Skip check if not due yet and not forced
    if (!force && !this.shouldCheck(serviceId)) {
      return this.getStatus(serviceId);
    }
    
    // Update timestamp
    this.connectionTimestamps.set(serviceId, Date.now());
    
    try {
      // If we have a check function, use it
      if (this._checkFns && this._checkFns[serviceId]) {
        const status = await this._checkFns[serviceId]();
        
        // Update the status
        this.connectionStatus.set(serviceId, {
          ...status,
          lastChecked: new Date()
        });
        
        // Notify listeners
        this._notifyListeners(serviceId, this.connectionStatus.get(serviceId));
        
        return this.connectionStatus.get(serviceId);
      }
      
      return { connected: false, lastChecked: new Date(), error: 'No check function registered' };
    } catch (error) {
      console.error(`Error checking connection for ${serviceId}:`, error);
      
      const status = {
        connected: false,
        lastChecked: new Date(),
        error: error.message
      };
      
      this.connectionStatus.set(serviceId, status);
      this._notifyListeners(serviceId, status);
      
      return status;
    }
  }

  /**
   * Notify listeners of status change
   * @private
   */
  _notifyListeners(serviceId, status) {
    if (!this.statusListeners.has(serviceId)) return;
    
    for (const listener of this.statusListeners.get(serviceId)) {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    }
  }

  /**
   * Set connection check interval for a service
   */
  setCheckInterval(serviceId, interval) {
    this.checkIntervals[serviceId] = interval;
  }
}

// Export singleton instance
const connectionMonitor = new ConnectionMonitor();
export default connectionMonitor;
