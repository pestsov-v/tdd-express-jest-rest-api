const express = require('express');
const router = express.Router();
const userService = require('./userService');
const { check, validationResult } = require('express-validator');

router.post(
  '/api/v1/users',
  check('username').notEmpty().withMessage('Username cannot be null'),
  check('email').notEmpty().withMessage('Email cannot be null'),
  check('password').notEmpty().withMessage('Password cannot be null'),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const validationErrors = {};

      errors.array().forEach((error) => (validationErrors[error.param] = error.msg));
      return res.status(400).send({ validationErrors: validationErrors });
    }
    await userService.save(req.body);
    return res.status(200).send({ message: 'user created' });
  }
);

module.exports = router;
