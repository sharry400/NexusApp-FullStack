const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['meeting_request', 'meeting_accepted', 'meeting_rejected', 'new_message', 'system'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },

  relatedMeetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting'
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);