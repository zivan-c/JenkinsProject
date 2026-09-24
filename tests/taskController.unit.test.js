//this section tests the controller logic without requiring
//a real MongoDB database

//recreates the model methods with jest functions
jest.mock('../models/Task', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

//imports
const mongoose = require('mongoose');
const Task = require('../models/Task');
const controller = require('../controllers/taskController');

//helper functions for express res responses
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

//clear all before each test 
beforeEach(() => {
  jest.clearAllMocks();
});

//list of tests
describe('task controller', () => {
  test('getTasks returns all tasks with no filters', async () => {
    const sort = jest.fn().mockResolvedValue([{ title: 'One' }]);
    Task.find.mockReturnValue({ sort });

    const req = { query: {} };
    const res = mockResponse();
    const next = mockNext();

    await controller.getTasks(req, res, next);

    expect(Task.find).toHaveBeenCalledWith({});
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.json).toHaveBeenCalledWith([{ title: 'One' }]);
    expect(next).not.toHaveBeenCalled();
  });

  test('getTasks applies status and priority filters', async () => {
    const sort = jest.fn().mockResolvedValue([]);
    Task.find.mockReturnValue({ sort });

    await controller.getTasks(
      { query: { status: 'done', priority: 'high' } },
      mockResponse(),
      mockNext()
    );

    expect(Task.find).toHaveBeenCalledWith({ status: 'done', priority: 'high' });
  });


  test('getTasks passes database errors to next', async () => {
    const error = new Error('database failure');
    const sort = jest.fn().mockRejectedValue(error);
    Task.find.mockReturnValue({ sort });
    const next = mockNext();

    await controller.getTasks({ query: {} }, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('getTask rejects an invalid id', async () => {
    const res = mockResponse();

    await controller.getTask({ params: { id: 'bad-id' } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid task ID.' });
    expect(Task.findById).not.toHaveBeenCalled();
  });

  test('getTask returns 404 when task does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Task.findById.mockResolvedValue(null);
    const res = mockResponse();

    await controller.getTask({ params: { id } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Task not found.' });
  });

  test('getTask returns the task', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const task = { _id: id, title: 'Task' };
    Task.findById.mockResolvedValue(task);
    const res = mockResponse();

    await controller.getTask({ params: { id } }, res, mockNext());

    expect(res.json).toHaveBeenCalledWith(task);
  });


  test('getTask passes database errors to next', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const error = new Error('database failure');
    Task.findById.mockRejectedValue(error);
    const next = mockNext();

    await controller.getTask({ params: { id } }, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('createTask creates and returns a task', async () => {
    const task = { _id: '1', title: 'New task' };
    Task.create.mockResolvedValue(task);
    const res = mockResponse();

    await controller.createTask(
      {
        body: {
          title: 'New task',
          description: 'Description',
          status: 'todo',
          priority: 'medium'
        }
      },
      res,
      mockNext()
    );

    expect(Task.create).toHaveBeenCalledWith({
      title: 'New task',
      description: 'Description',
      status: 'todo',
      priority: 'medium'
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(task);
  });


  test('createTask passes database errors to next', async () => {
    const error = new Error('database failure');
    Task.create.mockRejectedValue(error);
    const next = mockNext();

    await controller.createTask({ body: { title: 'Task' } }, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('updateTask rejects an invalid id', async () => {
    const res = mockResponse();

    await controller.updateTask({ params: { id: 'bad-id' }, body: {} }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('updateTask returns 404 when task does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Task.findByIdAndUpdate.mockResolvedValue(null);
    const res = mockResponse();

    await controller.updateTask({ params: { id }, body: { title: 'Updated' } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Task not found.' });
  });

  test('updateTask returns updated task', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const task = { _id: id, title: 'Updated' };
    Task.findByIdAndUpdate.mockResolvedValue(task);
    const res = mockResponse();

    await controller.updateTask(
      { params: { id }, body: { title: 'Updated', status: 'done', priority: 'high' } },
      res,
      mockNext()
    );

    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      {
        title: 'Updated',
        description: undefined,
        status: 'done',
        priority: 'high'
      },
      { new: true, runValidators: true }
    );
    expect(res.json).toHaveBeenCalledWith(task);
  });


  test('updateTask passes database errors to next', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const error = new Error('database failure');
    Task.findByIdAndUpdate.mockRejectedValue(error);
    const next = mockNext();

    await controller.updateTask({ params: { id }, body: {} }, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('deleteTask rejects an invalid id', async () => {
    const res = mockResponse();

    await controller.deleteTask({ params: { id: 'bad-id' } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Task.findByIdAndDelete).not.toHaveBeenCalled();
  });

  test('deleteTask returns 404 when task does not exist', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Task.findByIdAndDelete.mockResolvedValue(null);
    const res = mockResponse();

    await controller.deleteTask({ params: { id } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(404);
  });


  test('deleteTask passes database errors to next', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const error = new Error('database failure');
    Task.findByIdAndDelete.mockRejectedValue(error);
    const next = mockNext();

    await controller.deleteTask({ params: { id } }, mockResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('deleteTask returns 204 when task is deleted', async () => {
    const id = new mongoose.Types.ObjectId().toString();
    Task.findByIdAndDelete.mockResolvedValue({ _id: id });
    const res = mockResponse();

    await controller.deleteTask({ params: { id } }, res, mockNext());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
