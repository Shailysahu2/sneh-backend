const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config({ path: '../.env' });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const listUsers = async () => {
  try {
    await connectDB();
    
    const users = await User.find({}).select('-password'); // Exclude password field
    console.log('\nUsers in database:');
    console.log('==================');
    
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log('------------------');
        console.log('ID:', user._id);
        console.log('Email:', user.email);
        console.log('First Name:', user.firstName);
        console.log('Last Name:', user.lastName);
        console.log('Role:', user.role);
        console.log('Created At:', user.createdAt);
        console.log('Is Active:', user.isActive);
        console.log('Is Verified:', user.isVerified);
      });
    }
    
    console.log('\nTotal users:', users.length);
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    mongoose.disconnect();
  }
};

listUsers(); 