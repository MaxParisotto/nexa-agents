/**
 * A simple implementation of the EventEmitter pattern for browser environments
 */
class EventEmitter {
  constructor() {
    this._events = {};
  }

  /**
   * Add a listener for an event
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   * @returns {EventEmitter} - Returns this for chaining
   */
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  /**
   * Add a one-time listener for an event
   * @param {string} event - Event name
   * @param {Function} listener - Callback function
   * @returns {EventEmitter} - Returns this for chaining
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };
    onceWrapper.listener = listener;
    return this.on(event, onceWrapper);
  }

  /**
   * Remove a listener for an event
   * @param {string} event - Event name
   * @param {Function} listenerToRemove - Callback function to remove
   * @returns {EventEmitter} - Returns this for chaining
   */
  off(event, listenerToRemove) {
    if (!this._events[event]) {
      return this;
    }
    
    this._events[event] = this._events[event].filter(
      listener => listener !== listenerToRemove && listener.listener !== listenerToRemove
    );
    
    return this;
  }

  /**
   * Emit an event with data
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to listeners
   * @returns {boolean} - True if event had listeners, false otherwise
   */
  emit(event, ...args) {
    if (!this._events[event]) {
      return false;
    }
    
    this._events[event].forEach(listener => {
      listener.apply(this, args);
    });
    
    return true;
  }

  /**
   * Remove all listeners for an event, or all events
   * @param {string} [event] - Event name (optional)
   * @returns {EventEmitter} - Returns this for chaining
   */
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }
}

export default EventEmitter;
