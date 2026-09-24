//tests the whole thing altogether

//imports
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../server');
const Task = require('../models/Task');

jest.setTimeout(30000);

//to hold a reference to the mongodb instance
let mongoServer;

//executed before all test cases are run
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
        binary: {
            version: '7.0.43'
        }
    });

    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
});

//executed after each test case is run
afterEach(async () => {

    //removes all in the task collection to reset for next test
    await Task.deleteMany({});
});

//executed after all test cases are run
afterAll(async () => {

    //removes the temporary database and stops the connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (mongoServer) {
        await mongoServer.stop();
    }
});


//full list of tests
describe('Tasks API integration', () => {
  test('GET /api/health returns healthy response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('GET /api/tasks initially returns an empty list', async () => {
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('POST /api/tasks creates a task', async () => {
    const response = await request(app).post('/api/tasks').send({
      title: 'Integration task',
      description: 'Created by Supertest',
      status: 'todo',
      priority: 'high'
    });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Integration task');
    expect(response.body.priority).toBe('high');
    expect(response.body._id).toEqual(expect.any(String));
  });

  test('POST /api/tasks rejects invalid task data', async () => {
    const response = await request(app).post('/api/tasks').send({
      title: 'A'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed.');
  });

  test('GET /api/tasks/:id returns a created task', async () => {
    const task = await Task.create({ title: 'Read task' });

    const response = await request(app).get(`/api/tasks/${task._id}`);

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Read task');
  });

  test('GET /api/tasks supports status and priority filters', async () => {
    await Task.create({ title: 'Done task', status: 'done', priority: 'high' });
    await Task.create({ title: 'Todo task', status: 'todo', priority: 'low' });

    const response = await request(app).get('/api/tasks?status=done&priority=high');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].title).toBe('Done task');
  });

  test('GET /api/tasks/:id returns 400 for an invalid id', async () => {
    const response = await request(app).get('/api/tasks/not-an-id');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid task ID.');
  });

  test('GET /api/tasks/:id returns 404 for a missing task', async () => {
    const id = new mongoose.Types.ObjectId();

    const response = await request(app).get(`/api/tasks/${id}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Task not found.');
  });

  test('PUT /api/tasks/:id updates a task', async () => {
    const task = await Task.create({ title: 'Before update' });

    const response = await request(app)
      .put(`/api/tasks/${task._id}`)
      .send({
        title: 'After update',
        description: 'Updated description',
        status: 'done',
        priority: 'medium'
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('After update');
    expect(response.body.status).toBe('done');
  });

  test('PUT /api/tasks/:id returns 400 for an invalid id', async () => {
    const response = await request(app)
      .put('/api/tasks/not-an-id')
      .send({ title: 'Updated' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid task ID.');
  });

  test('DELETE /api/tasks/:id deletes a task', async () => {
    const task = await Task.create({ title: 'Delete me' });

    const response = await request(app).delete(`/api/tasks/${task._id}`);

    expect(response.status).toBe(204);
    await expect(Task.findById(task._id)).resolves.toBeNull();
  });

  test('DELETE /api/tasks/:id returns 404 for a missing task', async () => {
    const id = new mongoose.Types.ObjectId();

    const response = await request(app).delete(`/api/tasks/${id}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Task not found.');
  });
});
