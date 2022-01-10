const Sequelise = require('sequelize');

const sequelize = new Sequelise('hoaxify', 'my-db-user', 'db-password', {
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false,
});

module.exports = sequelize;
