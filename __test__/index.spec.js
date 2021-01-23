import request from 'supertest';
import app from '../src/app';

describe('Server starting test', () => {
  it('return 200 on get base url', async () => {
    return request(app).get('/').expect(200);
  });

  it('return 404 on post base url', async () => {
    return request(app).post('/').expect(404);
  });
});
