const User = require('./userModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const emailException = require('../email/emailException');
const invalidTokenException = require('../user/invalidTokenException');
const userNotFoundException = require('./userNotFoundException');

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

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });

  if (!user) {
    throw new invalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

const getUsers = async (page) => {
  const pageSize = 10;
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: pageSize,
    offset: page * pageSize,
  });

  return {
    content: usersWithCount.rows,
    page,
    size: 10,
    totalPages: Math.ceil(usersWithCount.count / pageSize),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({
    where: {
      id: id,
      inactive: false,
    },
    attributes: ['id', 'username', 'email'],
  });

  if (!user) {
    throw new userNotFoundException();
  }

  return user;
};

module.exports = { save, findByEmail, activate, getUsers, getUser };
