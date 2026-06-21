const express = require('express');
const router = express.Router();
const { scheduleMeeting, updateMeetingStatus, getUserMeetings } = require('../controllers/meetingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/schedule', protect, scheduleMeeting);

router.get('/', protect, getUserMeetings);

router.put('/:id/status', protect, updateMeetingStatus);

module.exports = router;