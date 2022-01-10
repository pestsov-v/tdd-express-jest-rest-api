const express = require('express');

const app = express();

const PORT = 3000 || process.env.PORT;
const serverHandler = () => {
  console.log(`Сервер запущен на порте: ${PORT}`);
};

app.listen(PORT, serverHandler);
