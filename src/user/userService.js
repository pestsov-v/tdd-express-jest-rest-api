const User = require('./userModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  try {
    const { username, email, password } = body;
    const hash = await bcrypt.hash(password, 10);

    const user = { username: username, email: email, password: hash, activationToken: generateToken(16) };
    await User.create(user);
  } catch (e) {
    console.log(e);
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

module.exports = { save, findByEmail };
