const express = require('express');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Create a task (admin only)
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate } = req.body;
    
    // Check if employee exists
    const employee = await Employee.findById(assignedTo);
    if (!employee) {
      return res.status(400).json({ error: 'Employee not found' });
    }

    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      dueDate
    });

    await task.save();
    
    // Add task to employee's tasks array
    employee.tasks.push(task._id);
    await employee.save();

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all tasks (admin only)
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'user')
      .populate('assignedBy', 'email')
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for an employee (admin or the employee)
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.employeeId);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if user is admin or the employee
    if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await Task.find({ assignedTo: employee._id })
      .populate('assignedBy', 'email')
      .sort({ dueDate: 1 });
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status (admin or assigned employee)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is admin or the assigned employee
    const employee = await Employee.findById(task.assignedTo);
    if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { status } = req.body;
    task.status = status;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a task (admin only)
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Remove task from employee's tasks array
    await Employee.findByIdAndUpdate(task.assignedTo, {
      $pull: { tasks: task._id }
    });

    await task.remove();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 