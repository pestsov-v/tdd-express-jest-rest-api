const express = require('express');
const userRoute = require('../src/user/userRoutes');
const app = express();

app.use(express.json());

app.use(userRoute);

console.log('env: ' + process.env.NODE_ENV);

module.exports = app;