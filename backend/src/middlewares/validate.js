const { logger } = require('../config/logger');

/**
 * Zod şeması ile req.body doğrulama (Hafta 4)
 */
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Geçersiz istek gövdesi.';
      logger.debug(`[validate] ${req.method} ${req.originalUrl}: ${msg}`);
      return res.status(400).json({ error: msg, status: 400 });
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = { validateBody };
