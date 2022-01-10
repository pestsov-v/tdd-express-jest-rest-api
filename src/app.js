const express = require('express');
const userRoute = require('../src/user/userRoutes');
const app = express();

app.use(express.json());

app.use(userRoute);

module.exports = app;
