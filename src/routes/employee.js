const express = require('express');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Create an employee (admin only)
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { user, role, department } = req.body;
    
    // Check if user exists and is not already an employee
    const existingUser = await User.findById(user);
    if (!existingUser) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const existingEmployee = await Employee.findOne({ user });
    if (existingEmployee) {
      return res.status(400).json({ error: 'User is already an employee' });
    }

    const employee = new Employee({ user, role, department });
    await employee.save();
    
    // Update user role
    existingUser.role = 'employee';
    await existingUser.save();

    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all employees (admin only)
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('user', 'email')
      .populate('tasks');
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single employee by ID (admin or the employee)
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('user', 'email')
      .populate('tasks');
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if user is admin or the employee
    if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an employee (admin only)
router.put('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'email').populate('tasks');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an employee (admin only)
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update user role back to 'user'
    await User.findByIdAndUpdate(employee.user, { role: 'user' });
    
    await employee.remove();
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track attendance (login)
router.post('/:id/attendance/login', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if user is admin or the employee
    if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add login timestamp
    employee.attendance.push({ login: new Date() });
    await employee.save();

    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Track attendance (logout)
router.post('/:id/attendance/logout', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if user is admin or the employee
    if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update last attendance record with logout timestamp
    const lastAttendance = employee.attendance[employee.attendance.length - 1];
    if (lastAttendance && !lastAttendance.logout) {
      lastAttendance.logout = new Date();
      await employee.save();
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 