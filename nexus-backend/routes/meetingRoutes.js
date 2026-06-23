const express = require('express');
const router = express.Router();
const { scheduleMeeting, updateMeetingStatus, getUserMeetings, getMeetingById, deleteMeeting } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/schedule', protect, scheduleMeeting);
router.get('/', protect, getUserMeetings);
router.get('/:id', protect, getMeetingById);
router.put('/:id/status', protect, updateMeetingStatus);
router.delete('/:id', protect, deleteMeeting);

module.exports = router;