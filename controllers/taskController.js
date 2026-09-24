const mongoose = require('mongoose');
const Task = require('../models/Task');

const isValidId = (id) => mongoose.isValidObjectId(id);

async function getTasks(req, res, next) {
  try {
    const filter = {};

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority
    });

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        status: req.body.status,
        priority: req.body.priority
      },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID.' });
    }

    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask
};
