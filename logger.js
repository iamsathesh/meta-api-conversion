const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFile = path.join(logsDir, 'app.log');

function formatLogMessage(level, data) {
  const timestamp = new Date().toISOString();
  // Ensure the required fields are formatted nicely
  const logEntry = {
    timestamp,
    level,
    OpportunityID: data.OpportunityID || 'N/A',
    ContactID: data.ContactID || 'N/A',
    EventID: data.EventID || 'N/A',
    EventName: data.EventName || 'N/A',
    ProductName: data.ProductName || 'N/A',
    PaymentID: data.PaymentID || 'N/A',
    HTTPStatus: data.HTTPStatus || 'N/A',
    MetaResponse: data.MetaResponse || 'N/A',
    ErrorMessage: data.ErrorMessage || 'N/A',
    ...data // include any other fields
  };
  return JSON.stringify(logEntry) + '\n';
}

function writeLog(level, data) {
  const message = formatLogMessage(level, data);
  
  // Log to console
  if (level === 'ERROR') {
    console.error(message.trim());
  } else {
    console.log(message.trim());
  }

  // Log to file
  fs.appendFile(logFile, message, (err) => {
    if (err) console.error('Failed to write to log file', err);
  });
}

module.exports = {
  info: (data) => writeLog('INFO', data),
  success: (data) => writeLog('SUCCESS', data),
  error: (data) => writeLog('ERROR', data),
  warn: (data) => writeLog('WARN', data)
};
