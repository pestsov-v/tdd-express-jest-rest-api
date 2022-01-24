const request = require('supertest');
const app = require('../src/app');

describe('Listing Users', () => {
  it('returns 200 ok when there are no user in database', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });

  it('returns page object aas response body', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });
});
