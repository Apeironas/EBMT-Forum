const { logger } = require('../config/logger');

function notFoundHandler(req, res) {
  const status = 404;
  const error = 'İstenen endpoint bulunamadı.';
  logger.debug(`[404] ${req.method} ${req.originalUrl}`);
  res.status(status).json({ error, status });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Sunucu hatası.';

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} — ${message}`, err);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} — ${message}`);
  }

  const body = { error: message, status };
  if (process.env.NODE_ENV === 'development' && err.stack) {
    body.stack = err.stack;
  }
  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
