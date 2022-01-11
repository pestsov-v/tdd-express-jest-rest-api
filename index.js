const app = require('./src/app');
const sequelize = require('./src/config/database');

sequelize.sync({ force: true });

const PORT = 3000 || process.env.PORT;
const serverHandler = () => {
  console.log(`Сервер запущен на порте: ${PORT}`);
};

app.listen(PORT, serverHandler);
