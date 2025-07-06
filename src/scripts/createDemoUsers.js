const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sneh', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const createDemoUsers = async () => {
  try {
    await connectDB();
    
    const demoUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isVerified: true
      },
      {
        email: 'employee@example.com',
        password: 'emp123',
        firstName: 'Employee',
        lastName: 'User',
        role: 'employee',
        isVerified: true
      },
      {
        email: 'user@example.com',
        password: 'user123',
        firstName: 'Customer',
        lastName: 'User',
        role: 'customer',
        isVerified: true
      }
    ];

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create new user
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${userData.email} with role: ${userData.role}`);
    }

    console.log('\nDemo users creation completed!');
    
    // List all users
    const allUsers = await User.find({}).select('-password');
    console.log('\nAll users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    mongoose.disconnect();
  }
};

createDemoUsers(); 