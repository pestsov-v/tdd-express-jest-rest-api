const app = require('./src/app');
const sequelize = require('./src/config/database');
const User = require('./src/user/userModel');

const addUsers = async (activeUserCount, inactiveUserAcount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserAcount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@gmail.com`,
      inactive: i >= activeUserCount,
    });
  }
};

sequelize.sync({ force: true }).then(async () => {
  await addUsers(25);
});

const PORT = 3000 || process.env.PORT;
const serverHandler = () => {
  console.log(`Сервер запущен на порте: ${PORT}`);
};

app.listen(PORT, serverHandler);
