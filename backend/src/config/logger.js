const fs = require('fs');
const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
fs.mkdirSync(logDir, { recursive: true });

const isProd = process.env.NODE_ENV === 'production';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    const base = `${timestamp} [${level}] ${message}`;
    return stack && !isProd ? `${base}\n${stack}` : base;
  })
);

const transports = [
  new winston.transports.Console({
    level: isProd ? 'info' : 'debug',
    format: winston.format.combine(
      winston.format.colorize({ all: !isProd }),
      logFormat
    )
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat
  }),
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat
  })
];

const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  transports
});

module.exports = { logger };
