# JobEase Backend API

Backend server for the JobEase mobile application built with Node.js, Express, and MongoDB.

## Features

- User authentication (Sign up, Login)
- Secure password reset via email links
- JWT token-based authentication
- MongoDB database with Mongoose ODM
- RESTful API endpoints
- Input validation
- Error handling
- CORS enabled

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory (use `.env.example` as a template):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jobease
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=*
APP_URL=http://localhost:8081

# Gmail SMTP (recommended)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-digit-app-password-without-spaces
SMTP_FROM="JobEase Support <your-email@gmail.com>"
```

> **Heads-up:** if you want to use the app password you provided (`nsuq jrrs fiyw mckc`), drop the spaces before storing it: `nsuqjrrsfiywmckc`.

### 3. MongoDB Setup

#### Option A: Local MongoDB

1. Install MongoDB on your machine
2. Start MongoDB service
3. Update `MONGODB_URI` in `.env` to: `mongodb://localhost:27017/jobease`

#### Option B: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env` with your Atlas connection string

### 4. Run the Server

#### Development Mode (with auto-restart)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication Routes

#### Register User
```
POST /api/auth/signup
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User
```
POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
Response: {
  "success": true,
  "token": "jwt_token_here",
  "user": { ... }
}
```

#### Get Current User (Protected)
#### Request Password Reset
```
POST /api/auth/forgot-password
Body: {
  "email": "john@example.com"
}
Response: { "success": true, "message": "If an account exists..." }
```

#### Reset Password with Token
```
POST /api/auth/reset-password
Body: {
  "token": "tokenFromEmail",
  "password": "newStrongPassword"
}
```

## Password Reset Flow

1. User taps **Forgot Password** in the mobile app.
2. Backend issues a short-lived token, stores its hash on the user document, and emails a secure link via Gmail SMTP.
3. User follows the link, submits a new password along with the token, and immediately receives a fresh JWT for continued access.
```
GET /api/auth/me
Headers: {
  "Authorization": "Bearer jwt_token_here"
}
```

## Project Structure

```
backend/
├── config/
│   └── database.js      # MongoDB connection
├── controllers/
│   └── authController.js # Auth logic
├── middleware/
│   ├── auth.js          # JWT authentication
│   └── validator.js     # Input validation
├── models/
│   └── User.js          # User model
├── routes/
│   └── authRoutes.js    # Auth routes
├── server.js            # Main server file
└── package.json
```

## Technologies Used

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **dotenv** - Environment variables
- **cors** - Cross-origin resource sharing

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Input validation and sanitization
- Environment variables for sensitive data
- CORS configuration

## Next Steps

- Add more user profile fields
- Build job posting endpoints
- Add recommendation engine
- Add file upload for resumes


