const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/userModel');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;

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

beforeEach(() => {
  simulateSmtpFailure = false;
  return User.destroy({ truncate: true });
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
    expect(response.body.message).toBe('User created');
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

  const username_null = 'Username cannot be null';
  const username_size = 'Must have minimum 4 and max 32 characters';
  const email_null = 'Email cannot be null';
  const email_invalid = 'Email is not valid';
  const password_null = 'Password cannot be null';
  const password_size = 'Password must be at least 6 chatacters';
  const password_pattern = 'Password must have at least 1 uppercase, 1 lowercase letter and 1 number';
  const email_in_use = 'Email in use';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'Passd'}         | ${password_size}
    ${'password'} | ${'123456789'}     | ${password_pattern}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lower4444'}     | ${password_pattern}
    ${'password'} | ${'UPPER4444'}     | ${password_pattern}
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

  it(`returns ${email_in_use} when same email is already in use when language is set Russian`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(email_in_use);
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
    expect(response.body.message).toBe('Email failure');
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });
});

describe('Internationalization', () => {
  const postUser = (user = validUser) => {
    return request(app).post('/api/v1/users').set('Accept-Language', 'ru').send(user);
  };

  const username_null = 'Имя пользователя не может быть пустым';
  const username_size = 'Имя пользователя должно быть не меньше 4 символов и не больше 32 символов';
  const email_null = 'Email не может быть пустым';
  const email_invalid = 'Email введён не верно';
  const password_null = 'Пароль не может быть пустым';
  const password_size = 'Пароль должен быть не короче 6 символов';
  const password_pattern = 'Пароль должен иметь: 1 символ в нижнем регистре, 1 символ в верхнем регистре и 1 цифру';
  const email_in_use = 'Такой email уже используется';
  const user_create_success = 'Пользователь создан';
  const email_failure = 'Email не был отправлен';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_size}
    ${'username'} | ${'a'.repeat(33)}  | ${username_size}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'user.mail.com'} | ${email_invalid}
    ${'email'}    | ${'user@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'Passd'}         | ${password_size}
    ${'password'} | ${'123456789'}     | ${password_pattern}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lower4444'}     | ${password_pattern}
    ${'password'} | ${'UPPER4444'}     | ${password_pattern}
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

  it(`returns "${email_in_use}" when same email is already in use and language is set as Russian`, async () => {
    await User.create({ ...validUser });
    const response = await postUser();
    expect(response.body.validationErrors.email).toBe(email_in_use);
  });

  it(`returns success message of "${user_create_success}" when signup request is valid and language is set as Russian`, async () => {
    const response = await postUser();
    expect(response.body.message).toBe(user_create_success);
  });

  it(`return "${email_failure}" message when sending emails fails and send a message in Russian`, async () => {
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(email_failure);
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
    ${'ru'}  | ${'wrong'}   | ${'Этот аккаунт был ранее активирован или токен больше не действителен'}
    ${'en'}  | ${'wrong'}   | ${'This account is either active or the token is invalid'}
    ${'ru'}  | ${'correct'} | ${'Акаунт активирован'}
    ${'en'}  | ${'correct'} | ${'Account is activated'}
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
