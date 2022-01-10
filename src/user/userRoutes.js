const express = require('express');
const router = express.Router();
const userService = require('./userService');

router.post('/api/v1/users', async (req, res) => {
  await userService.save(req.body);
  return res.status(200).send({ message: 'user created' });
});

module.exports = router;
