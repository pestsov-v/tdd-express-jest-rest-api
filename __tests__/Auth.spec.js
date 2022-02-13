const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/userModel');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const ru = require('../locales/ru/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const activeUser = { username: 'user1', email: 'user1@gmail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentification = async (credentials, options = {}) => {
  let agent = request(app).post('/api/v1/auth');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
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

  it('returns 401 when user doesn`t exist', async () => {
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('returns proper error body when authentification fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    const error = response.body;
    expect(error.path).toBe('/api/v1/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'ru'}  | ${ru.authentification_failure}
    ${'en'}  | ${en.authentification_failure}
  `('returns $message when authentification fails and language is set a $language', async ({ language, message }) => {
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' }, { language });
    expect(response.body.message).toBe(message);
  });

  it('returns 401 when password is wrong', async () => {
    await addUser();
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'Password' });
    expect(response.status).toBe(401);
  });

  it('returns 403 when logging in with an inactive account', async () => {
    await addUser({ ...activeUser, inactive: true });
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    expect(response.status).toBe(403);
  });

  it('returns proper error body when inactive authentification fails', async () => {
    await addUser({ ...activeUser, inactive: true });
    const nowInMillis = new Date().getTime();
    const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' });
    const error = response.body;
    expect(error.path).toBe('/api/v1/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it.each`
    language | message
    ${'ru'}  | ${ru.inactive_authentification_failure}
    ${'en'}  | ${en.inactive_authentification_failure}
  `(
    'returns $message when authentification fails for inactive account and language is set a $language',
    async ({ language, message }) => {
      await addUser({ ...activeUser, inactive: true });
      const response = await postAuthentification({ email: 'user1@gmail.com', password: 'P4ssword' }, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 401 when e-mail is not valid', async () => {
    const response = await postAuthentification({ password: 'P4ssword' });
    expect(response.status).toBe(401);
  });

  it('returns 401 when password is not valid', async () => {
    const response = await postAuthentification({ email: 'user1@gmail.com' });
    expect(response.status).toBe(401);
  });
});
