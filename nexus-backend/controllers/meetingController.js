const { v4: uuidv4 } = require('uuid');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');

exports.scheduleMeeting = async (req, res) => {
  try {
    const { receiverId, title, description, date, startTime, endTime } = req.body;
    const requesterId = req.user._id || req.user.id;

    const existingMeetings = await Meeting.find({
      receiver: receiverId,
      date: date,
      status: { $in: ['Pending', 'Accepted'] }
    });

    const hasConflict = existingMeetings.some(meeting => {
      return (startTime < meeting.endTime) && (endTime > meeting.startTime);
    });

    if (hasConflict) {
      return res.status(400).json({ message: 'Time slot is already booked or has a pending request.' });
    }

    const roomId = uuidv4();

    const newMeeting = new Meeting({
      requester: requesterId,
      receiver: receiverId,
      title,
      description,
      date,
      startTime,
      endTime,
      meetingLink: roomId
    });

    await newMeeting.save();

    const newNotification = new Notification({
      recipient: receiverId,
      sender: requesterId,
      type: 'meeting_request',
      message: `You have a new meeting request: "${title}"`,
      relatedMeetingId: newMeeting._id
    });

    await newNotification.save();

    res.status(201).json({ message: 'Meeting scheduled successfully', meeting: newMeeting });

  } catch (error) {
    console.error('Schedule Meeting Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateMeetingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const meetingId = req.params.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    meeting.status = status;
    await meeting.save();

    const notificationMsg = status === 'Accepted'
      ? `Your meeting request for "${meeting.title}" has been accepted!`
      : `Your meeting request for "${meeting.title}" has been declined.`;

    const statusNotification = new Notification({
      recipient: meeting.requester,
      sender: meeting.receiver,
      type: status === 'Accepted' ? 'meeting_accepted' : 'meeting_rejected',
      message: notificationMsg,
      relatedMeetingId: meeting._id
    });

    await statusNotification.save();

    res.json({ message: `Meeting ${status} successfully`, meeting });
  } catch (error) {
    console.error('Update Meeting Status Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUserMeetings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const meetings = await Meeting.find({
      $or: [{ requester: userId }, { receiver: userId }]
    }).populate('requester receiver', 'name email avatarUrl').sort({ date: 1 });

    res.json(meetings);
  } catch (error) {
    console.error('Get User Meetings Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('requester receiver', 'name email avatarUrl');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (error) {
    console.error('Get Meeting Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    // Allow requester or receiver to delete
    const userId = req.user._id || req.user.id;
    if (meeting.requester.toString() !== userId.toString() && meeting.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this meeting' });
    }

    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Delete Meeting Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};