const express = require('express');
const router = express.Router();
const userService = require('../user/userService');

router.post('/api/v1/auth', async (req, res) => {
  const { email } = req.body;
  const user = await userService.findByEmail(email);
  console.log(user);

  res.send({
    id: user.id,
    username: user.username,
  });
});

module.exports = router;
