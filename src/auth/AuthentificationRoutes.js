const express = require('express');
const router = express.Router();
const userService = require('../user/userService');
const AuthentificationException = require('./authentificationException');
const forbiddenException = require('../error/forbiddenException');
const bcrypt = require('bcrypt');
const { check, validationResult } = require('express-validator');

router.post('/api/v1/auth', check('email').isEmail(), async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AuthentificationException());
  }
  const { email, password } = req.body;
  const user = await userService.findByEmail(email);

  if (!user) {
    return next(new AuthentificationException());
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return next(new AuthentificationException());
  }

  if (user.inactive) {
    return next(new forbiddenException());
  }
  res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
