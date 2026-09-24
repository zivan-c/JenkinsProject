//this section tests the mongoDB model itself

const Task = require('../models/Task');

//list of tests
describe('Task model', () => {
  test('applies default status and priority', () => {
    const task = new Task({ title: 'Write tests' });

    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.description).toBe('');
  });

  test('requires a title', async () => {
    const task = new Task({});
    await expect(task.validate()).rejects.toThrow(/title/i);
  });

  test('rejects titles shorter than 2 characters', async () => {
    const task = new Task({ title: 'A' });
    await expect(task.validate()).rejects.toThrow(/minimum allowed length/i);
  });

  test('rejects titles longer than 100 characters', async () => {
    const task = new Task({ title: 'A'.repeat(101) });
    await expect(task.validate()).rejects.toThrow(/maximum allowed length/i);
  });

  test('rejects descriptions longer than 500 characters', async () => {
    const task = new Task({ title: 'Valid title', description: 'A'.repeat(501) });
    await expect(task.validate()).rejects.toThrow(/maximum allowed length/i);
  });

  test('accepts valid status values', async () => {
    for (const status of ['todo', 'in-progress', 'done']) {
      const task = new Task({ title: 'Valid title', status });
      await expect(task.validate()).resolves.toBeUndefined();
    }
  });

  test('rejects invalid status values', async () => {
    const task = new Task({ title: 'Valid title', status: 'blocked' });
    await expect(task.validate()).rejects.toThrow(/is not a valid enum value/);
  });

  test('accepts valid priority values', async () => {
    for (const priority of ['low', 'medium', 'high']) {
      const task = new Task({ title: 'Valid title', priority });
      await expect(task.validate()).resolves.toBeUndefined();
    }
  });

  test('rejects invalid priority values', async () => {
    const task = new Task({ title: 'Valid title', priority: 'urgent' });
    await expect(task.validate()).rejects.toThrow(/is not a valid enum value/);
  });
});
