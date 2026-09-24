const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
