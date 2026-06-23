const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile: user.profile }
    });

  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Email or Password' });
    }

    if (user.twoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.twoFactorCode = await bcrypt.hash(otp, 10);
      user.twoFactorExpires = Date.now() + 10 * 60 * 1000; // 10 mins
      await user.save();

      // Mock sending email
      console.log(`\n\n=== 2FA OTP for ${user.email}: ${otp} ===\n\n`);

      return res.status(200).json({
        message: '2FA required',
        requires2FA: true,
        email: user.email
      });
    }

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile: user.profile }
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {

    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Profile Fetch Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {

      user.name = req.body.name || user.name;

      if (req.body.profile) {
        const p = req.body.profile;
        if (p.bio !== undefined) user.profile.bio = p.bio;
        if (p.startupName !== undefined) user.profile.startupName = p.startupName;
        if (p.investmentHistory !== undefined) user.profile.investmentHistory = p.investmentHistory;
        if (p.preferences !== undefined) user.profile.preferences = p.preferences;
        if (p.location !== undefined) user.profile.location = p.location;
        if (p.foundedYear !== undefined) user.profile.foundedYear = p.foundedYear;
        if (p.teamSize !== undefined) user.profile.teamSize = p.teamSize;
        if (p.avatarUrl !== undefined) user.profile.avatarUrl = p.avatarUrl;
      }

      const updatedUser = await user.save();

      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          profile: updatedUser.profile
        }
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Profile Update Error:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.toggle2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.json({ message: `2FA ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`, twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    console.error('Toggle 2FA Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.twoFactorEnabled || !user.twoFactorCode) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    if (Date.now() > user.twoFactorExpires) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.twoFactorCode);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Reset 2FA codes
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, profile: user.profile }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};