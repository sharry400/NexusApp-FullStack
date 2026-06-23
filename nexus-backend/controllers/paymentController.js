const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const transactions = await Transaction.find({
      $or: [{ user: userId }, { recipient: userId }]
    })
      .populate('user recipient', 'name email avatarUrl')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Get Transactions Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getWalletBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    res.json({ balance: user.walletBalance || 0 });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });

    const userId = req.user._id || req.user.id;

    const transaction = new Transaction({
      user: userId,
      type: 'deposit',
      amount,
      status: 'Completed',
      referenceId: uuidv4(),
      description: description || 'Account Deposit'
    });
    await transaction.save();

    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } });

    res.status(201).json({ message: 'Deposit successful', transaction });
  } catch (error) {
    console.error('Deposit Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    const transaction = new Transaction({
      user: userId,
      type: 'withdraw',
      amount,
      status: 'Completed',
      referenceId: uuidv4(),
      description: description || 'Account Withdrawal'
    });
    await transaction.save();

    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } });

    res.status(201).json({ message: 'Withdrawal successful', transaction });
  } catch (error) {
    console.error('Withdraw Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.transfer = async (req, res) => {
  try {
    const { amount, recipientId, description } = req.body;
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });

    const userId = req.user._id || req.user.id;
    if (userId.toString() === recipientId) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    const sender = await User.findById(userId);
    const recipient = await User.findById(recipientId);

    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });
    if (sender.walletBalance < amount) return res.status(400).json({ message: 'Insufficient funds' });

    const transaction = new Transaction({
      user: userId,
      recipient: recipientId,
      type: 'transfer',
      amount,
      status: 'Completed',
      referenceId: uuidv4(),
      description: description || 'Funds Transfer'
    });
    await transaction.save();

    await User.findByIdAndUpdate(userId, { $inc: { walletBalance: -amount } });
    await User.findByIdAndUpdate(recipientId, { $inc: { walletBalance: amount } });

    res.status(201).json({ message: 'Transfer successful', transaction });
  } catch (error) {
    console.error('Transfer Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
