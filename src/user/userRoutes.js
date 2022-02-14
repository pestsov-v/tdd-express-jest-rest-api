const express = require('express');
const router = express.Router();
const userService = require('./userService');
const { check, validationResult } = require('express-validator');
const validationException = require('../error/validationException');
const pagination = require('../middleware/pagination');
const forbiddenException = require('../error/forbiddenException');

router.post(
  '/api/v1/users',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_size'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .custom(async (email) => {
      const user = await userService.findByEmail(email);
      if (user) {
        throw new Error('email_in_use');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_size')
    .bail()
    .matches(/(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next(new validationException(errors.array()));
    }
    try {
      await userService.save(req.body);
      return res.status(200).send({ message: req.t('user_create_success') });
    } catch (e) {
      next(e);
    }
  }
);

router.post('/api/v1/users/token/:token', async (req, res, next) => {
  const token = req.params.token;

  try {
    await userService.activate(token);
    return res.send({ message: req.t('account_activation_success') });
  } catch (e) {
    next(e);
  }
});

router.get('/api/v1/users', pagination, async (req, res) => {
  const { page, size } = req.pagination;
  const users = await userService.getUsers(page, size);

  res.send(users);
});

router.get('/api/v1/users/:id', async (req, res, next) => {
  try {
    const user = await userService.getUser(req.params.id);
    res.send(user);
  } catch (e) {
    next(e);
  }
});

router.put('/api/v1/users/:id', () => {
  throw new forbiddenException('unauthorized_user_update');
});

module.exports = router;
