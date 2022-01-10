const request = require('supertest');
const app = require('../src/app');

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
});
