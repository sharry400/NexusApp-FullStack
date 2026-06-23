const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Investor', 'Entrepreneur'],
    required: true
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorCode: {
    type: String
  },
  twoFactorExpires: {
    type: Date
  },

  profile: {
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    startupName: { type: String, default: '' },
    industry: { type: String, default: '' },
    location: { type: String, default: '' },
    foundedYear: { type: String, default: '' },
    teamSize: { type: String, default: '' },
    investmentHistory: { type: String, default: '' },
    preferences: { type: [String], default: [] }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);