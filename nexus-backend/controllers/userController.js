const User = require('../models/User');

exports.getUsersByRole = async (req, res) => {
  try {
    const role = req.query.role;

    const users = await User.find({ role: role }).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Fetch Users Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Fetch User By ID Error:', error.message);

    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (user) {
      user.name = req.body.name || user.name;

      user.profile = {
        ...user.profile,
        ...req.body.profile
      };

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update Profile Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};