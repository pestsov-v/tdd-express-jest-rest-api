const express = require('express');
const User = require('./user/User');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

app.post('/api/v1/users', (req, res) => {
  bcrypt.hash(req.body.password, 10).then((hash) => {
    const user = { ...req.body, password: hash };
    // const user = Object.assign({}, req.body, { password: hash });
    // const user = {
    //   username: req.body.username,
    //   email: req.body.email,
    //   password: hash,
    // };
    User.create(user).then(() => {
      return res.status(200).send({ message: 'user created' });
    });
  });
});

module.exports = app;
