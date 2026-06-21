const express = require('express');
const router = express.Router();

const { getUsersByRole, getUserById, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getUsersByRole);

router.put('/profile', protect, updateUserProfile);

router.get('/:id', protect, getUserById);

module.exports = router;