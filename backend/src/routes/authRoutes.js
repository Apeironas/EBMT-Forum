const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const {
  registerSchema,
  loginSchema,
  refreshSchema
} = require('../validation/schemas');

router.post('/register', validateBody(registerSchema), authController.register);
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);

router.get('/me', verifyToken, authController.me);

module.exports = router;