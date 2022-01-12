const User = require('./userModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const emailException = require('../email/emailException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hash = await bcrypt.hash(password, 10);

  const user = { username: username, email: email, password: hash, activationToken: generateToken(16) };
  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });
  try {
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (e) {
    await transaction.rollback();
    throw new emailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

module.exports = { save, findByEmail };
