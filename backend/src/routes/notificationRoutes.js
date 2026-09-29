const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

router.get('/', verifyToken, notificationController.listNotifications);
router.patch('/read-all', verifyToken, notificationController.markAllRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);
router.patch('/:id/read', verifyToken, notificationController.markRead);

module.exports = router;
