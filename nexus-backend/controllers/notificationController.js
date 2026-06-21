const Notification = require('../models/Notification');

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'name avatarUrl role')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Fetch Notifications Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};