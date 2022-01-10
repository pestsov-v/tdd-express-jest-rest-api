const express = require('express');
const router = express.Router();
const userService = require('./userService');

router.post('/api/v1/users', async (req, res) => {
  const user = req.body;

  if (user.username === null) {
    return res.status(400).send({
      validationErrors: {
        username: 'Username cannot be null',
      },
    });
  }

  await userService.save(req.body);
  return res.status(200).send({ message: 'user created' });
});

module.exports = router;
