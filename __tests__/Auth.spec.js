const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/userModel');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const addUser = async () => {
  const user = { username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false };
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentification = async (credentials) => {
  return await request(app).post('/api/v1/auth').send(credentials);
};

describe('Authentification', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    expect(response.status).toBe(200);
  });

  it('returns only user id and username when login success', async () => {
    const user = await addUser();
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });
});
