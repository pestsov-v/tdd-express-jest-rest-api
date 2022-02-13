const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/userModel');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../locales/en/translation.json');
const ru = require('../locales/ru/translation.json');

let lastMail;
let server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('invalid mailbox');
          err.response = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(8587, 'localhost');

  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user1',
  email: 'user1@mail.com',
  password: 'Password123',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/v1/users').send(user);
};

describe('User Registration', () => {
  it('returns 200 OK when signup requiest is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when sugnup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves the user to database', async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user1@mail.com');
  });

  it('hashes the password in password in the database', async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('Password123');
  });

  it('returns 400 when user is null', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'Password123',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation error occurs', async () => {
    const response = await postUser({
      username: null,
      email: 'user1@mail.com',
      password: 'Password123',
    });

    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it('returns errors for both when username and email is null', async () => {
    const response = await postUser({
      username: null,
      email: null,
      password: 'Password123',
    });

    const body = response.body;

    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'usr'}           | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_size}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'Passd'}         | ${en.password_size}
    ${'password'} | ${'123456789'}     | ${en.password_pattern}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'lower4444'}     | ${en.password_pattern}
    ${'password'} | ${'UPPER4444'}     | ${en.password_pattern}
  `(
    'returns $expectedMessage when $field is $value when language is set Russian',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      };

      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${en.email_in_use} when same email is already in use when language is set Russian`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(en.email_in_use);
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'Password123',
    });

    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body containers inactive a false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activationToken for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an account activation email with activationToken', async () => {
    await postUser();

    const users = await User.findAll();
    const savedUser = users[0];

    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad gadway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
  });

  it('return email failure message when sending emails fails', async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('returns validation failure message in error response body when validation failure', async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'Password123',
    });

    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  const postUser = (user = validUser) => {
    return request(app).post('/api/v1/users').set('Accept-Language', 'ru').send(user);
  };

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${ru.username_null}
    ${'username'} | ${'usr'}           | ${ru.username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${ru.username_size}
    ${'email'}    | ${null}            | ${ru.email_null}
    ${'email'}    | ${'mail.com'}      | ${ru.email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${ru.email_invalid}
    ${'email'}    | ${'user@mail'}     | ${ru.email_invalid}
    ${'password'} | ${null}            | ${ru.password_null}
    ${'password'} | ${'Passd'}         | ${ru.password_size}
    ${'password'} | ${'123456789'}     | ${ru.password_pattern}
    ${'password'} | ${'alllowercase'}  | ${ru.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${ru.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${ru.password_pattern}
    ${'password'} | ${'lower4444'}     | ${ru.password_pattern}
    ${'password'} | ${'UPPER4444'}     | ${ru.password_pattern}
  `('returns "$expectedMessage" when "$field" is "$value"', async ({ field, expectedMessage, value }) => {
    const user = {
      username: 'user1',
      email: 'user1@mail.com',
      password: 'Password123',
    };

    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns "${ru.email_in_use}" when same email is already in use and language is set as Russian`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(ru.email_in_use);
  });

  it(`returns success message of "${ru.user_create_success}" when signup request is valid and language is set as Russian`, async () => {
    const response = await postUser();
    expect(response.body.message).toBe(ru.user_create_success);
  });

  it(`return "${ru.email_failure}" message when sending emails fails and send a message in Russian`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(ru.email_failure);
  });

  it(`returns "${ru.validation_failure}" message in error response body when validation fails`, async () => {
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'Password123',
    });

    expect(response.body.message).toBe(ru.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();

    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'ru'}  | ${'wrong'}   | ${ru.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'ru'}  | ${'correct'} | ${ru.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'return $message when wrong token is $tokenStatus sent and language is $language',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-does-not-exist';

      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post('/api/v1/users/token/' + token)
        .set('Accept-Language', language)
        .send();

      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationErors in response when validation failure', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp and message in response when request fails other than validation error', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();

    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in erorr body', async () => {
    const token = 'this-token-does-not-exist';

    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();

    const body = response.body;
    expect(body.path).toEqual('/api/v1/users/token/' + token);
  });

  it('returns timestamp in milliseconds within 5 seconds value in error body', async () => {
    const token = 'this-token-does-not-exist';
    const nowInMillis = new Date().getTime();
    const fiveSeconds = nowInMillis + 5 * 1000;
    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();

    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSeconds);
  });
});
