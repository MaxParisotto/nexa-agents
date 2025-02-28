import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Tooltip,
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon, Send as SendIcon, Maximize as MaximizeIcon, Close as CloseIcon, Refresh as RefreshIcon, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material';
import Draggable from 'react-draggable';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useDispatch, useSelector } from 'react-redux';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';

import 'react-resizable/css/styles.css';

/**
 * ProjectManagerChat component that provides a floating, resizable, draggable chat interface
 * for interacting with the Project Manager agent. This agent is persistent across the project
 * and uses a dedicated LLM endpoint with function calling capabilities.
 */
const ProjectManagerChat = () => {
  const dispatch = useDispatch();
  const nodeRef = useRef(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(500);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartDimensions, setResizeStartDimensions] = useState({ width: 0, height: 0 });
  const [resizeStartPosition, setResizeStartPosition] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const chatContainerRef = useRef(null);
  const [messageListenerAdded, setMessageListenerAdded] = useState(false);
  const [projectManagerRequestListenerAdded, setProjectManagerRequestListenerAdded] = useState(false);
  
  // Add a refresh counter to force re-renders when needed
  const [refreshCounter, setRefreshCounter] = useState(0);
  const forceRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
    console.log("🔄 Forcing component refresh");
  }, []);

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 350, height: 500 });
  
  /**
   * Enhanced debug logging to trace message flow
   * @param {string} source - Source of the log (function or event)
   * @param {string} message - Log message
   * @param {object} data - Additional data to log
   */
  const debugLog = useCallback((source, message, data = {}) => {
    console.log(`[PM-CHAT-DEBUG] [${new Date().toISOString()}] [${source}] ${message}`, 
      typeof data === 'object' ? { ...data, timestamp: Date.now() } : data);
  }, []);
  
  // Get Project Manager settings from Redux store with fallbacks
  const settingsSelector = useCallback((state) => state.settings, []);
  const settings = useSelector(settingsSelector);

  // Memoize default models to prevent recreation
  const defaultModels = useMemo(() => ({
    lmStudio: 'qwen2.5-7b-instruct',
    ollama: 'llama2'
  }), []);

  // Memoize default parameters to prevent recreation
  const defaultParameters = useMemo(() => ({
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    maxTokens: 1024,
    contextLength: 4096
  }), []);

  // Memoize the settings merge function
  const mergeSettings = useCallback((reduxSettings, cachedSettings) => {
    const serverType = reduxSettings?.serverType || cachedSettings?.serverType || 'lmStudio';
    const defaultModel = defaultModels[serverType];

    return {
      apiUrl: reduxSettings?.apiUrl || cachedSettings?.apiUrl || 
             (serverType === 'lmStudio' ? 'http://localhost:1234' : 'http://localhost:11434'),
      model: reduxSettings?.model || cachedSettings?.model || defaultModel,
      serverType,
      loading: false,
      error: null,
      parameters: {
        ...defaultParameters,
        ...(reduxSettings?.parameters || cachedSettings?.parameters || {})
      }
    };
  }, [defaultModels, defaultParameters]);

  // Memoize the project manager settings
  const projectManagerSettings = useMemo(() => {
    // Try to get settings from Redux
    const reduxSettings = settings?.projectManager;
    
    // Try to get cached settings from sessionStorage as fallback
    const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
    
    // Log what we're using as a fallback
    if (!reduxSettings && !cachedSettings) {
      debugLog('settings', 'Using default settings', {
        serverType: 'lmStudio',
        defaultModel: defaultModels.lmStudio,
        source: 'fallback'
      });
    }
    
    // Merge settings using memoized function
    return mergeSettings(reduxSettings, cachedSettings);
  }, [settings, defaultModels, mergeSettings, debugLog]);

  // Cache settings in session storage when they change
  useEffect(() => {
    if (projectManagerSettings) {
      // Only cache if we have valid settings
      if (projectManagerSettings.apiUrl && projectManagerSettings.model) {
        sessionStorage.setItem('projectManagerSettings', JSON.stringify(projectManagerSettings));
        debugLog('settings', 'Cached project manager settings', {
          model: projectManagerSettings.model,
          serverType: projectManagerSettings.serverType
        });
      }
    }
  }, [projectManagerSettings, debugLog]);

  // Add initialization tracking ref with more state
  const initializationRef = useRef({
    isInitializing: false,
    lastInitTime: 0,
    timeoutId: null,
    initCount: 0,
    maxInitAttempts: 3,
    lastError: null
  });

  const initializeSettings = async () => {
    // Prevent multiple initializations and limit attempts
    if (initializationRef.current.isInitializing) {
      debugLog('initialization', 'Initialization already in progress, skipping');
      return false;
    }

    if (initializationRef.current.initCount >= initializationRef.current.maxInitAttempts) {
      debugLog('initialization', 'Max initialization attempts reached', {
        attempts: initializationRef.current.initCount,
        maxAttempts: initializationRef.current.maxInitAttempts,
        lastError: initializationRef.current.lastError
      });
      return false;
    }

    // Rate limit initialization attempts
    const now = Date.now();
    if (now - initializationRef.current.lastInitTime < 5000) {
      debugLog('initialization', 'Initialization rate limited', {
        timeSinceLastInit: now - initializationRef.current.lastInitTime,
        initCount: initializationRef.current.initCount
      });
      return false;
    }

    try {
      initializationRef.current.isInitializing = true;
      initializationRef.current.lastInitTime = now;
      initializationRef.current.initCount++;

      // Log the current settings
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Initializing Project Manager settings',
        { settings: projectManagerSettings }
      ));

      // Send an initialization event
      const event = new CustomEvent('project-manager-request', {
        detail: {
          target: 'project-manager',
          message: '__initialize__',
          messageId: `init-${now}`,
          timestamp: new Date().toISOString(),
          settings: projectManagerSettings
        }
      });
      window.dispatchEvent(event);

      // Cache settings
      sessionStorage.setItem('projectManagerSettings', JSON.stringify(projectManagerSettings));
      
      // Clear any existing initialization timeout
      if (initializationRef.current.timeoutId) {
        clearTimeout(initializationRef.current.timeoutId);
      }

      // Send a single initialization complete message
      const initKey = 'pm_last_init_time';
      const lastInitTime = sessionStorage.getItem(initKey);
      
      if (!lastInitTime || (now - parseInt(lastInitTime, 10)) > 5000) {
        sessionStorage.setItem(initKey, now.toString());
        
        initializationRef.current.timeoutId = setTimeout(() => {
          const testEvent = new CustomEvent('project-manager-message', {
            detail: {
              content: 'Project Manager initialized and ready',
              message: 'Project Manager initialized and ready',
              messageId: `init-complete-${now}`,
              timestamp: new Date().toISOString(),
              isSystemMessage: true
            }
          });
          window.dispatchEvent(testEvent);
          initializationRef.current.timeoutId = null;
        }, 1000);
      }
      
      return true;
    } catch (error) {
      initializationRef.current.lastError = error;
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Failed to initialize Project Manager settings',
        {
          error: error.message,
          settings: projectManagerSettings,
          attempt: initializationRef.current.initCount
        }
      ));
      return false;
    } finally {
      initializationRef.current.isInitializing = false;
    }
  };

  // Initialize settings on mount with cleanup
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      if (!mounted) return;
      await initializeSettings();
    };

    initialize();
    
    return () => {
      mounted = false;
      if (initializationRef.current.timeoutId) {
        clearTimeout(initializationRef.current.timeoutId);
      }
      initializationRef.current = {
        isInitializing: false,
        lastInitTime: 0,
        timeoutId: null,
        initCount: 0,
        maxInitAttempts: 3,
        lastError: null
      };
    };
  }, [projectManagerSettings]); // Only re-run when settings change

  // Initialize position and load conversation history
  useEffect(() => {
    // Setup event listener for dock toggling
    const handleDockToggle = (event) => {
      const { isOpen, chatType } = event.detail;
      
      // Only respond to project manager chat toggle events
      if (chatType !== 'projectManager') return;
      
      setMinimized(!isOpen);
      
      // If opening from dock, position near the dock
      if (isOpen) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Use fixed dimensions for positioning calculations
        setPosition({
          x: (viewportWidth / 2) - 175, // Half of default 350px width
          y: viewportHeight - 500 - 80  // Default 500px height
        });
      }
    };
    
    window.addEventListener('toggle-project-manager-chat', handleDockToggle);
    
    // Initialize position to bottom right - ONLY RUN THIS ON MOUNT
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Only set initial position if not already set
    if (position.x === 0 && position.y === 0) {
      const initialX = viewportWidth - 350 - 20; // Fixed 350px width
      const initialY = viewportHeight - 500 - 80; // Fixed 500px height
      
      setPosition({ x: initialX, y: initialY });
      setExpandedPosition({ x: initialX, y: initialY });
    }

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('toggle-project-manager-chat', handleDockToggle);
    };
  }, []); // Empty array ensures this only runs once on mount

  // Load conversation in a separate effect with empty dependency
  useEffect(() => {
    const savedConversation = localStorage.getItem('projectManagerConversation');
    if (savedConversation) {
      try {
        setConversation(JSON.parse(savedConversation));
      } catch (error) {
        console.error('Failed to parse saved conversation:', error);
        // Add welcome message if loading fails
        addWelcomeMessage();
      }
    } else {
      // Add welcome message if no conversation exists
      addWelcomeMessage();
    }
  }, []); // Empty dependency array - only run once on mount

  // Define the event handler with useCallback to prevent unnecessary re-creation
  const handleProjectManagerMessage = useCallback((event) => {
    // Extract message content from event detail
    const message = typeof event.detail === 'object' ? 
      (event.detail.message || event.detail.content) : 
      event.detail;
    
    if (!message) return;

    // Add message to conversation with proper formatting
    const newMessage = {
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    setConversation(prev => {
      // Remove any "thinking" messages first
      const filtered = prev.filter(msg => !msg.isThinking);
      return [...filtered, newMessage];
    });

    // Auto-scroll after short delay
    setTimeout(() => {
      chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, 100);
  }, []);
  
  // Add more debug tracing to message event listener with specific focus on the thinking message
  useEffect(() => {
    // EMERGENCY FIX: Add circuit breaker to prevent message flooding
    let messageCount = 0;
    let lastResetTime = Date.now();
    const MESSAGE_THRESHOLD = 50; // Max 50 messages per second before breaking the circuit
    
    // Always remove previous listeners before adding new ones to avoid duplicates
    window.removeEventListener('project-manager-message', handleProjectManagerMessage);
    
    // Create a wrapped handler with circuit breaker
    const circuitBreakerHandler = (event) => {
      const now = Date.now();
      
      // Reset counter if window has passed
      if (now - lastResetTime > 1000) {
        messageCount = 0;
        lastResetTime = now;
      }
      
      // Increment counter
      messageCount++;
      
      // Check for message flood
      if (messageCount > MESSAGE_THRESHOLD) {
        console.error(`🔥 EMERGENCY: Message flood detected in chat component! ${messageCount} messages in 1 second`);
        console.error('Stopping message processing to prevent browser crash');
        
        // Add a visible error message to the conversation
        setConversation(prev => {
          const errorMessage = {
            role: 'assistant',
            content: `⚠️ SYSTEM ALERT: Too many messages detected (${messageCount} per second). Message processing has been stopped. Please refresh the page.`,
            messageId: `circuit-breaker-${Date.now()}`,
            timestamp: new Date().toISOString(),
            isError: true
          };
          
          return [...prev, errorMessage];
        });
        
        return; // Don't process this message
      }
      
      // If we haven't broken the circuit, process normally
      handleProjectManagerMessage(event);
    };
    
    // Add the circuit-breaker-wrapped event listener
    window.addEventListener('project-manager-message', circuitBreakerHandler);
    setMessageListenerAdded(true);
    
    // Log current event listener status
    console.log('🚨 EVENT LISTENER STATUS:', {
      message: 'Adding project-manager-message event listener with circuit breaker',
      refresh: refreshCounter,
      listenerAdded: messageListenerAdded
    });
    
    // Return cleanup function
    return () => {
      window.removeEventListener('project-manager-message', circuitBreakerHandler);
      debugLog('cleanupListener', 'Removed project-manager-message event listener');
    };
  }, [handleProjectManagerMessage, refreshCounter]);

  // Remove the separate listener for cleanup since we're handling it in the main listener
  useEffect(() => {
    if (!projectManagerRequestListenerAdded) {
      setProjectManagerRequestListenerAdded(true);
    }
  }, [projectManagerRequestListenerAdded]);

  // Scroll to bottom of chat when conversation updates
  useEffect(() => {
    if (chatContainerRef.current && !minimized) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Save conversation to localStorage
    localStorage.setItem('projectManagerConversation', JSON.stringify(conversation));
  }, [conversation, minimized]);

  // Add cleanup for event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Define these handlers with useCallback first, before any references to them
  const handleResizeMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartPosition.x;
    const deltaY = e.clientY - resizeStartPosition.y;
    
    const newWidth = Math.max(300, resizeStartDimensions.width + deltaX);
    const newHeight = Math.max(200, resizeStartDimensions.height + deltaY);
    
    setWidth(newWidth);
    setHeight(newHeight);
    setExpandedDimensions({ width: newWidth, height: newHeight });
  }, [isResizing, resizeStartPosition, resizeStartDimensions]);
  
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, []);

  // Now the cleanup can safely reference the handler functions
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);
  
  // Fix circular dependency in handleResizeEnd
  useEffect(() => {
    const currentHandleResizeMove = handleResizeMove;
    const currentHandleResizeEnd = handleResizeEnd;
    
    // Update the handleResizeEnd function to use the latest references
    const updatedHandleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', currentHandleResizeMove);
      document.removeEventListener('mouseup', currentHandleResizeEnd);
    };
    
    // Replace our reference to handleResizeEnd with the updated one
    document.addEventListener('resize-end', updatedHandleResizeEnd);
    
    return () => {
      document.removeEventListener('resize-end', updatedHandleResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  // Add this debug useEffect to monitor conversation state changes
  useEffect(() => {
    // Only log when we have thinking messages to monitor
    const thinkingMessages = conversation.filter(msg => msg.isThinking);
    if (thinkingMessages.length > 0) {
      debugLog('conversationStateMonitor', 'Conversation state updated with thinking messages', {
        conversationLength: conversation.length,
        thinkingCount: thinkingMessages.length,
        thinkingIds: thinkingMessages.map(m => m.messageId),
        allMessageIds: conversation.map(m => ({
          id: m.messageId,
          role: m.role,
          isThinking: !!m.isThinking,
          preview: m.content.substring(0, 15) + (m.content.length > 15 ? '...' : '')
        }))
      });
      
      // Also check DOM to see if thinking messages are rendered
      setTimeout(() => {
        try {
          const domThinkingIndicators = document.querySelectorAll('.thinking-indicator');
          const domThinkingMessages = document.querySelectorAll('.thinking-message');
          
          debugLog('conversationStateMonitor', 'DOM thinking elements check', {
            indicators: domThinkingIndicators.length,
            messages: domThinkingMessages.length,
            indicatorIds: Array.from(domThinkingIndicators).map(el => el.id || 'unknown'),
            messageIds: Array.from(domThinkingMessages).map(el => el.id || 'unknown'),
            timeAfterStateUpdate: 'immediate check'
          });
        } catch (e) {
          debugLog('conversationStateMonitor', 'Error checking DOM after state update', { error: e.toString() });
        }
      }, 0);
      
      // Check again after a delay to see if React has updated the DOM
      setTimeout(() => {
        try {
          const domThinkingIndicators = document.querySelectorAll('.thinking-indicator');
          const domThinkingMessages = document.querySelectorAll('.thinking-message');
          
          debugLog('conversationStateMonitor', 'DOM thinking elements after delay', {
            indicators: domThinkingIndicators.length,
            messages: domThinkingMessages.length,
            indicatorIds: Array.from(domThinkingIndicators).map(el => el.id || 'unknown'),
            messageIds: Array.from(domThinkingMessages).map(el => el.id || 'unknown'),
            timeAfterStateUpdate: '100ms check'
          });
        } catch (e) {
          debugLog('conversationStateMonitor', 'Error checking DOM after delay', { error: e.toString() });
        }
      }, 100);
    }
  }, [conversation, debugLog]);

  /**
   * Reset the chat history and settings
   */
  const handleReset = async () => {
    try {
      // Clear conversation history
      localStorage.removeItem('projectManagerConversation');
      
      // Clear cached settings
      sessionStorage.removeItem('projectManagerSettings');
      
      // Also clear potentially invalid configuration from localStorage
      // This helps prevent the mock model names from being restored
      const keysToClean = [
        'projectManagerModel',
        'projectManagerApiUrl',
        'projectManagerServerType',
        'projectManagerParameters'
      ];
      
      keysToClean.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          debugLog('handleReset', `Removed ${key} from localStorage`);
        }
      });
      
      // Check for and clean qwen2.5-7b-instruct-1m model in Redux persistence
      const settings = localStorage.getItem('settings');
      if (settings) {
        try {
          const parsedSettings = JSON.parse(settings);
          
          // Check for mock model names in persisted settings
          let cleaned = false;
          if (parsedSettings.projectManager?.model?.includes('qwen2.5-7b-instruct-1m')) {
            // Reset to valid model based on server type
            const serverType = parsedSettings.projectManager.serverType || 'lmStudio';
            const fallbackModel = serverType === 'lmStudio' ? 
              (parsedSettings.lmStudio?.defaultModel || 'qwen2.5-7b-instruct-1m') : 
              (parsedSettings.ollama?.defaultModel || 'llama2');
            
            parsedSettings.projectManager.model = fallbackModel;
            cleaned = true;
            
            debugLog('handleReset', 'Cleaned mock model from persisted settings', {
              oldModel: 'qwen2.5-7b-instruct-1m',
              newModel: fallbackModel
            });
          }
          
          if (cleaned) {
            localStorage.setItem('settings', JSON.stringify(parsedSettings));
          }
        } catch (e) {
          debugLog('handleReset', 'Error cleaning persisted settings', { error: e.toString() });
        }
      }
      
      // Log the reset
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Project Manager chat has been reset successfully'
      ));

      // Add reset message directly
      const resetMessage = {
        role: 'assistant',
        content: 'Chat has been reset successfully. Settings have been reinitialized.',
        messageId: `reset-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      // Clear conversation and add reset message
      setConversation([resetMessage]);
      
      debugLog('handleReset', 'Conversation reset', {
        newState: [resetMessage]
      });
      
      // Re-initialize settings
      setTimeout(() => {
        initializeSettings();
      }, 100);
      
      // Save the new conversation state
      localStorage.setItem('projectManagerConversation', JSON.stringify([resetMessage]));
      
    } catch (error) {
      // Handle any errors during reset
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Error resetting Project Manager chat',
        { error: error.message }
      ));

      const errorMessage = {
        role: 'assistant',
        content: `Error resetting chat: ${error.message}`,
        messageId: `reset-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setConversation([errorMessage]);
      localStorage.setItem('projectManagerConversation', JSON.stringify([errorMessage]));
    }
  };

  // Add a periodic cleanup mechanism to forcibly remove thinking messages after a timeout
  useEffect(() => {
    // Skip if there are no thinking messages
    const thinkingMessages = conversation.filter(msg => msg.isThinking);
    if (thinkingMessages.length === 0) return;
    
    debugLog('thinkingCleanup', 'Setting up thinking message cleanup timer', {
      thinkingCount: thinkingMessages.length,
      thinkingIds: thinkingMessages.map(m => m.messageId)
    });
    
    // Set a timeout to remove thinking messages that are too old (10 seconds)
    const cleanupTimeout = setTimeout(() => {
      // Get current thinking messages again to see if they've changed
      
      const currentThinkingMessages = conversation.filter(msg => msg.isThinking);
      
      if (currentThinkingMessages.length > 0) {
        debugLog('thinkingCleanup', 'Cleaning up stale thinking messages', {
          thinkingCount: currentThinkingMessages.length,
          thinkingIds: currentThinkingMessages.map(m => m.messageId),
          maxAgeMs: 10000
        });
        
        // Remove thinking messages that are more than 10 seconds old
        const now = Date.now();
        setConversation(prev => {
          // Identify thinking messages to remove based on age
          const messagesToRemove = prev.filter(msg => {
            if (!msg.isThinking) return false;
            
            try {
              // Calculate message age
              const msgTime = new Date(msg.timestamp).getTime();
              const ageMs = now - msgTime;
              return ageMs > 10000; // Remove if older than 10 seconds
            } catch (e) {
              // If we can't parse the timestamp, remove it to be safe
              return true;
            }
          });
          
          if (messagesToRemove.length === 0) {
            debugLog('thinkingCleanup', 'No stale thinking messages found');
            return prev; // No changes needed
          }
          
          debugLog('thinkingCleanup', 'Removing stale thinking messages', {
            removingCount: messagesToRemove.length,
            removingIds: messagesToRemove.map(m => m.messageId)
          });
          
          // Return new array without the old thinking messages
          // This is the proper React way - let React handle the DOM updates
          return prev.filter(msg => !messagesToRemove.includes(msg));
        });
        
        // Just log DOM state for debugging purposes but don't manipulate DOM directly
        try {
          const thinkingElements = document.querySelectorAll('.thinking-message');
          if (thinkingElements.length > 0) {
            debugLog('thinkingCleanup', 'Detected thinking elements in DOM after state update', {
              count: thinkingElements.length,
              ids: Array.from(thinkingElements).map(el => el.id || 'unknown')
            });
          }
        } catch (e) {
          debugLog('thinkingCleanup', 'Error checking DOM elements', { error: e.toString() });
        }
      }
    }, 10000); // Check after 10 seconds
    
    return () => {
      clearTimeout(cleanupTimeout);
    };
  }, [conversation, debugLog]);

  /**
   * Send a message to the chat
   */
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Generate more unique IDs with specific prefixes for easier tracing
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 10);
    const messageId = `msg-${timestamp}-${randomId}`;
    
    debugLog('handleSendMessage', 'Preparing to send message', {
      content: message.trim().substring(0, 50),
      messageId,
      timestamp
    });
    
    // Add user message to chat history first
    const userMessage = {
      role: 'user',
      content: message.trim(),
      messageId: `user-${messageId}`,
      timestamp: new Date().toISOString()
    };
    
    // Create a simple thinking message with ULTRA-UNIQUE ID to ensure we can find it later
    const thinkingMessage = {
      role: 'assistant',
      content: 'Thinking...',
      messageId: `thinking-${messageId}`,
      timestamp: new Date().toISOString(),
      isThinking: true,
      relatedToMessageId: messageId // Store which message this is thinking about
    };
    
    debugLog('handleSendMessage', 'Created message objects', {
      mainMessageId: messageId,
      userMessageId: userMessage.messageId,
      thinkingMessageId: thinkingMessage.messageId,
      content: message.trim().substring(0, 30) + (message.length > 30 ? '...' : '')
    });
    
    // Update conversation with both user message and thinking indicator
    setConversation(prev => {
      debugLog('handleSendMessage', 'Updating conversation state', {
        prevCount: prev.length,
        newCount: prev.length + 2,
        addingUserMessageId: userMessage.messageId,
        addingThinkingMessageId: thinkingMessage.messageId
      });
      return [...prev, userMessage, thinkingMessage];
    });
    
    // Auto-scroll to bottom
    if (chatContainerRef.current) {
      debugLog('handleSendMessage', 'Scrolling to bottom', {
        scrollHeight: chatContainerRef.current.scrollHeight
      });
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Capture the current message for the event
    const messageToSend = message.trim();
    
    // Clear input field early to improve user experience
    setMessage('');
    
    // Prepare the request event with explicit fields
    const event = new CustomEvent('project-manager-request', {
      detail: {
        target: 'project-manager',
        message: messageToSend,
        messageId, // Use the main messageId without prefix
        timestamp: new Date(timestamp).toISOString(),
        settings: projectManagerSettings
      }
    });
    
    // Dispatch the event after a slight delay to ensure DOM updates
    setTimeout(() => {
      debugLog('handleSendMessage', 'Dispatching request event', { 
        messageId,
        timestamp: Date.now() - timestamp + 'ms after creating message' 
      });
      window.dispatchEvent(event);
    }, 100); // Longer delay to ensure DOM is updated
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleDrag = (e, ui) => {
    const { x, y } = ui;
    setPosition({ x, y });
    
    if (!isCollapsed) {
      setExpandedPosition({ x, y });
    }
  };

  const handleCollapse = () => {
    if (isCollapsed) {
      // Expanding
      setIsCollapsed(false);
      setPosition(expandedPosition);
      setWidth(expandedDimensions.width);
      setHeight(expandedDimensions.height);
    } else {
      // Collapsing
      setExpandedPosition({ ...position });
      setExpandedDimensions({ width, height });
      setIsCollapsed(true);
      setHeight(40); // Collapsed height
    }
  };

  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the header
    if (e.target.closest('.chat-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      
      // Prevent text selection during drag
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
      
      if (!isCollapsed) {
        setExpandedPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e) => {
    setIsResizing(true);
    setResizeStartDimensions({
      width,
      height
    });
    setResizeStartPosition({
      x: e.clientX,
      y: e.clientY
    });
    
    // Add global event listeners for resize
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Prevent text selection during resize
    e.preventDefault();
  };
  
  const toggleMinimize = () => {
    setMinimized(!minimized);
    
    // Dispatch event to notify other components
    const event = new CustomEvent('project-manager-chat-visibility-changed', {
      detail: { isVisible: minimized }
    });
    window.dispatchEvent(event);
  };

  const closeChat = () => {
    setMinimized(true);
    
    // Dispatch event to notify other components
    const event = new CustomEvent('project-manager-chat-visibility-changed', {
      detail: { isVisible: false }
    });
    window.dispatchEvent(event);
  };

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      role: 'assistant',
      content: 'Hello! I am your Project Manager assistant. I can help you manage your project, organize tasks, and provide guidance. How can I assist you today?',
      timestamp: new Date().toISOString()
    };
    setConversation([welcomeMessage]);
    localStorage.setItem('projectManagerConversation', JSON.stringify([welcomeMessage]));
  };

  /**
   * Render a chat message
   */
  const renderMessage = (msg, index) => {
    // Make sure we have valid data to render
    if (!msg) {
      console.error('Attempted to render null message at index', index);
      return null;
    }
    
    const isUser = msg.role === 'user';
    const isThinking = msg.isThinking;
    const isError = msg.isError;
    
    // Create a guaranteed unique key
    const messageKey = msg.messageId || `msg-fallback-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
    
    return (
      <ListItem
        key={messageKey}
        id={messageKey}
        sx={{
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          padding: '8px 16px',
          opacity: isThinking ? 0.7 : 1,
        }}
        className={isThinking ? 'thinking-message' : ''}
      >
        <Box
          sx={{
            display: 'flex',
            maxWidth: '85%',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: isUser ? 'primary.main' : isError ? 'error.main' : 'secondary.main',
              width: 32,
              height: 32,
              marginRight: isUser ? 0 : 1,
              marginLeft: isUser ? 1 : 0,
            }}
          >
            {isUser ? <PersonIcon /> : <SmartToyIcon />}
          </Avatar>
          
          <Paper
            elevation={2}
            sx={{
              padding: '8px 16px',
              borderRadius: '12px',
              bgcolor: isError ? 'error.light' : (isUser ? 'primary.light' : 'background.paper'),
              color: isUser || isError ? 'primary.contrastText' : 'text.primary',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}
          >
            <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
              {isThinking ? (
                <Box 
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  className="thinking-indicator"
                  id={`thinking-indicator-${messageKey}`}
                >
                  <span>Thinking</span>
                  <span className="typing-dots">...</span>
                </Box>
              ) : (
                formatMessageContent(msg.content)
              )}
            </Typography>
            <Typography 
              variant="caption" 
              color="textSecondary" 
              sx={{ 
                display: 'block', 
                textAlign: isUser ? 'right' : 'left',
                fontSize: '0.7rem',
                mt: 0.5,
                opacity: 0.8
              }}
            >
              {formatTimestamp(msg.timestamp)}
            </Typography>
          </Paper>
        </Box>
      </ListItem>
    );
  };

  /**
   * Format message content with proper handling of code blocks and links
   */
  const formatMessageContent = (content) => {
    if (!content) return '';
    
    // Simple formatting for code blocks
    const formattedContent = content.split('```').map((segment, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <Box 
            component="pre" 
            key={index}
            sx={{ 
              backgroundColor: 'background.default',
              padding: '8px',
              borderRadius: '4px',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              margin: '8px 0',
              width: '100%',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {segment}
          </Box>
        );
      } else {
        // Regular text - handle line breaks
        return (
          <React.Fragment key={index}>
            {segment.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < segment.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      }
    });
    
    return formattedContent;
  };

  /**
   * Format timestamp to a readable format
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  const handleEmergencyStop = useCallback(() => {
    try {
      // Set local state first to prevent further interactions
      setIsProcessing(false);
      setMessage('');
      
      // Dispatch emergency shutdown event
      window.dispatchEvent(new CustomEvent('emergency-agent-shutdown', {
        detail: { 
          reason: 'User initiated emergency stop',
          timestamp: new Date().toISOString()
        }
      }));

      // Add shutdown message to conversation
      setConversation(prev => [
        ...prev,
        {
          role: 'system',
          content: '🛑 Emergency stop activated. The agent has been shut down. Please refresh the page to restart.',
          messageId: `emergency-stop-${Date.now()}`,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);

      // Disable further interactions
      setIsDisabled(true);
      
    } catch (error) {
      console.error('Error during emergency stop:', error);
      setConversation(prev => [
        ...prev,
        {
          role: 'system',
          content: `🛑 Error during emergency stop: ${error.message}`,
          messageId: `emergency-stop-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    }
  }, [setConversation, setIsProcessing, setMessage]);

  // Add emergency shutdown listener
  useEffect(() => {
    const handleEmergencyShutdown = (event) => {
      setIsDisabled(true);
      setIsProcessing(false);
      setMessage('');
    };

    window.addEventListener('emergency-agent-shutdown', handleEmergencyShutdown);
    return () => {
      window.removeEventListener('emergency-agent-shutdown', handleEmergencyShutdown);
    };
  }, []);

  // Fix the missing handleTest function
  const handleTest = useCallback(async () => {
    try {
      // Generate a unique message ID for the test
      const messageId = `test-${Date.now()}`;

      // Add user test message to conversation
      const testMessage = {
        role: 'user',
        content: '🔄 Testing connection...',
        messageId: `user-${messageId}`,
        timestamp: new Date().toISOString()
      };
      
      // Create a thinking message
      const thinkingMessage = {
        role: 'assistant',
        content: 'Thinking...',
        messageId: `thinking-${messageId}`,
        timestamp: new Date().toISOString(),
        isThinking: true
      };
      
      // Add messages to the conversation
      setConversation(prev => [...prev, testMessage, thinkingMessage]);
      
      console.log('🔍 DEBUG: Running connection test with messageId:', messageId);
      
      // Dispatch test request to ProjectManager
      const event = new CustomEvent('project-manager-request', {
        detail: {
          target: 'project-manager',
          message: '__test_connection__', // Special message to trigger direct API test
          messageId,
          timestamp: new Date().toISOString(),
          settings: projectManagerSettings
        }
      });
      
      // Wait a tiny bit before dispatching
      setTimeout(() => {
        console.log('🔍 DEBUG: Dispatching connection test event');
        window.dispatchEvent(event);
      }, 100);

      // Log test attempt
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Initiating Project Manager connection test',
        { settings: projectManagerSettings }
      ));

    } catch (error) {
      // Show error message
      const errorMessage = {
        role: 'assistant',
        content: `❌ Connection test failed: ${error.message}`,
        messageId: `test-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setConversation(prev => [...prev, errorMessage]);
      
      // Log error
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Project Manager connection test failed',
        { error: error.message }
      ));
    }
  }, [projectManagerSettings, dispatch]); // Important: Only include stable dependencies

  // Don't render if minimized
  if (minimized) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
      handle=".chat-header"
      bounds="parent"
    >
      <Box
        ref={nodeRef}
        sx={{
          position: 'fixed',
          zIndex: 1000,
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 3,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Chat Header */}
        <Box
          className="chat-header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'move',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SmartToyIcon sx={{ marginRight: 1, fontSize: 20 }} />
            <Typography variant="subtitle2">Project Manager</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Test Connection">
              <IconButton
                size="small"
                onClick={handleTest}
                sx={{ color: 'primary.contrastText', padding: '4px' }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Chat">
              <IconButton
                size="small"
                onClick={handleReset}
                sx={{ color: 'primary.contrastText', padding: '4px' }}
              >
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="EMERGENCY STOP - Halts message processing">
              <IconButton
                size="small"
                onClick={handleEmergencyStop}
                disabled={isDisabled}
                sx={{ 
                  color: 'error.main',
                  padding: '4px',
                  '&.Mui-disabled': {
                    color: 'error.light',
                  }
                }}
              >
                <span role="img" aria-label="emergency-stop">🛑</span>
              </IconButton>
            </Tooltip>
            <Tooltip title="Retry Initialization">
              <IconButton
                size="small"
                onClick={() => {
                  // Force reload settings from Redux
                  const currentSettings = settings?.projectManager;
                  console.log("🔄 Manual Reinitialization", { currentSettings });
                  
                  // Send an initialization event with the latest settings
                  const event = new CustomEvent('project-manager-request', {
                    detail: {
                      target: 'project-manager',
                      message: '__initialize__',
                      messageId: `reinit-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      settings: currentSettings
                    }
                  });
                  
                  // Add feedback message to the chat
                  const initMessage = {
                    role: 'assistant',
                    content: `🔄 Reinitializing with latest settings...\nAPI: ${currentSettings?.apiUrl}\nModel: ${currentSettings?.model}\nServer: ${currentSettings?.serverType}`,
                    messageId: `reinit-msg-${Date.now()}`,
                    timestamp: new Date().toISOString()
                  };
                  
                  setConversation(prev => [...prev, initMessage]);
                  
                  // Dispatch the event
                  window.dispatchEvent(event);
                }}
                sx={{ color: 'info.main', padding: '4px' }}
              >
                <span>🔄</span>
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              onClick={handleCollapse}
              sx={{ color: 'primary.contrastText', padding: '4px' }}
            >
              {isCollapsed ? <OpenInFullIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={closeChat}
              sx={{ color: 'primary.contrastText', padding: '4px' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Chat Messages */}
        {!isCollapsed && (
          <Box
            ref={chatContainerRef}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              backgroundColor: 'background.default',
              padding: '8px 0',
            }}
          >
            <List disablePadding>
              {conversation.map((msg, index) => renderMessage(msg, index))}
            </List>
          </Box>
        )}

        {/* Chat Input */}
        {!isCollapsed && (
          <Box
            sx={{
              display: 'flex',
              padding: '8px',
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              variant="outlined"
              value={message || ''} // Ensure we never pass undefined
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              sx={{ marginRight: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendMessage}
              disabled={!(message || '').trim()}
              sx={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
            >
              <SendIcon />
            </Button>
          </Box>
        )}

        {/* Resize Handle */}
        {!isCollapsed && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '20px',
              height: '20px',
              cursor: 'nwse-resize',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderTop: '1px solid',
              borderLeft: '1px solid',
              borderColor: 'divider',
              borderTopLeftRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                width: '6px',
                height: '6px',
                borderBottom: '2px solid',
                borderRight: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
              },
              zIndex: 1001, // Make sure this is above other elements
            }}
            onMouseDown={handleResizeStart}
          />
        )}
      </Box>
    </Draggable>
  );
};

export default ProjectManagerChat;
