const express = require('express');
const router = express.Router();
const { getUserNotifications, markAllAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUserNotifications);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/mark-read', protect, markAllAsRead);

module.exports = router;