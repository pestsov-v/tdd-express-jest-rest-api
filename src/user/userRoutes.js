const express = require('express');
const router = express.Router();
const userService = require('./userService');

const validateUsername = (req, res, next) => {
  const user = req.body;

  if (user.username === null) {
    req.validationErrors = {
      username: 'Username cannot be null',
    };
  }
  next();
};

const validateEmail = (req, res, next) => {
  const user = req.body;

  if (user.email === null) {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'Email cannot be null',
    };
  }
  next();
};

router.post('/api/v1/users', validateUsername, validateEmail, async (req, res) => {
  if (req.validationErrors) {
    const response = { validationErrors: { ...req.validationErrors } };
    return res.status(400).send(response);
  }
  await userService.save(req.body);
  return res.status(200).send({ message: 'user created' });
});

module.exports = router;
