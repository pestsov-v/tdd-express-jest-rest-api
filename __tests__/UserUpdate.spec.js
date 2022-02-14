const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/userModel');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const ru = require('../locales/ru/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const putUser = (id = 5, body = null, options = {}) => {
  const agent = request(app).put('/api/v1/users/' + id);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(body);
};

describe('User Update', () => {
  it('returns forbidden when request sent without autorization', async () => {
    const response = await putUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'ru'}  | ${ru.unauthorized_user_update}
    ${'en'}  | ${en.unauthorized_user_update}
  `(
    'returns error body with $message for unathorized request when language is $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putUser(5, null, { language });
      expect(response.body.path).toBe('/api/v1/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
});
