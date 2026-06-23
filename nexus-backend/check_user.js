const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'sharryiqbal73@gmail.com' });
  console.log('User:', user ? { email: user.email, role: user.role, id: user._id } : 'Not found');
  process.exit();
}
checkUser();
