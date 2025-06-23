const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'warehouse', 'support', 'sales'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  attendance: [{
    login: {
      type: Date,
      required: true
    },
    logout: {
      type: Date
    }
  }]
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee; 