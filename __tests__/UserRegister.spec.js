const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  it('returns 200 OK when signup requiest is valid', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      })
      .then((response) => {
        expect(response.status).toBe(200);
        done();
      });
  });

  it('returns success message when sugnup request is valid', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      })
      .then((response) => {
        expect(response.body.message).toBe('user created');
        done();
      });
  });

  it('saves the user to database', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      })
      .then(() => {
        User.findAll().then((userList) => {
          expect(userList.length).toBe(1);
          done();
        });
      });
  });

  it('saves the username and email to database', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      })
      .then(() => {
        User.findAll().then((userList) => {
          const savedUser = userList[0];
          expect(savedUser.username).toBe('user1');
          expect(savedUser.email).toBe('user1@mail.com');
          done();
        });
      });
  });

  it('hashes the password in password in the database', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'user1',
        email: 'user1@mail.com',
        password: 'Password123',
      })
      .then(() => {
        User.findAll().then((userList) => {
          const savedUser = userList[0];
          expect(savedUser.password).not.toBe('Password123');
          done();
        });
      });
  });
});
