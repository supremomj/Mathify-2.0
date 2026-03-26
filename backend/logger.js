/**
 * Simple logging utility for Mathify
 * Provides structured logging with different log levels
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

// Ensure logs directory exists (shielded for production/docker)
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Logging to file disabled: Could not create log directory.', e.message);
}

/**
 * Format log message with timestamp
 */
function formatLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  return JSON.stringify(logEntry);
}

/**
 * Write log to file
 */
function writeLog(level, message, data = null) {
  try {
    const logLine = formatLog(level, message, data) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    // Fallback to console if file write fails
    console.error('Failed to write log:', error);
    console.log(formatLog(level, message, data));
  }
}

const logger = {
  /**
   * Log info message
   */
  info(message, data = null) {
    const formatted = formatLog('INFO', message, data);
    console.log(formatted);
    writeLog('INFO', message, data);
  },

  /**
   * Log warning message
   */
  warn(message, data = null) {
    const formatted = formatLog('WARN', message, data);
    console.warn(formatted);
    writeLog('WARN', message, data);
  },

  /**
   * Log error message
   */
  error(message, error = null, data = null) {
    const errorData = {
      ...data,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    const formatted = formatLog('ERROR', message, errorData);
    console.error(formatted);
    writeLog('ERROR', message, errorData);
  },

  /**
   * Log debug message (only in development)
   */
  debug(message, data = null) {
    if (process.env.NODE_ENV !== 'production') {
      const formatted = formatLog('DEBUG', message, data);
      console.debug(formatted);
      writeLog('DEBUG', message, data);
    }
  }
};

module.exports = logger;


