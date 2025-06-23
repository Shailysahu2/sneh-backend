# E-commerce Backend

This is the backend for the MEAN stack e-commerce platform. It provides RESTful API endpoints for managing products, orders, users, and more.

## Features

- RESTful API endpoints
- JWT Authentication
- Role-based access control (RBAC)
- MongoDB integration
- Socket.IO for real-time notifications
- Email notifications
- Payment gateway integration
- AI features using Hugging Face APIs

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Socket.IO
- Nodemailer
- Stripe/PayPal/Razorpay
- Hugging Face APIs

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example` and update the values
4. Start the server:
   ```bash
   npm run dev
   ```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Testing

Run tests using:
```bash
npm test
``` 