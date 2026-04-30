# JOBEASE : Applying made easy

![JobEase](https://imgshields.io/badge/JobEase-React_Native-blue.svg) ![Backend](https://img.shields.io/badge/Backend-Node.js_Express-green.svg)

JobEase is an automated job application and tracking system designed to make the job application process seamless. It consists of a React Native mobile application (built with Expo) and a Node.js/Express backend that handles user authentication, automated job scraping, resume scoring, and application tracking.

## Features

* **User Authentication**: Secure Sign Up, Login, and Password Reset via JWT and email links.
* **Job Portal Integration**: Automated job browsing, queueing, and applying for platforms like Naukri.
* **Resume Parsing & Scoring**: Evaluates resumes to match job descriptions seamlessly.
* **Application Tracker**: Keep track of applied, queued, and rejected applications.
* **Cross-Platform Mobile App**: Built with Expo to run on iOS and Android.
* **Robust Backend API**: Built using Express, MongoDB, and Mongoose with strong security features including bcrypt password hashing.

## Project Structure

```
Jobease/
├── app/                      # React Native app (Expo Router)
│   ├── (auth)/              # Authentication screens
│   ├── (tabs)/              # Main app screens (Discover, Portals, Tracker, Profile)
│   └── index.tsx            # Root screen
├── backend/                 # Node.js backend
│   ├── config/              # Configuration (MongoDB, etc.)
│   ├── controllers/         # Route controllers
│   ├── models/              # MongoDB models (User, Job, Application)
│   ├── routes/              # API routes
│   └── server.js            # Main server entry file
└── docs/                    # Project documentation and reports
```

## Prerequisites

Before getting started, make sure you have the following installed:
- [Node.js](https://nodejs.org/en/) (v16 or higher)
- npm or yarn
- [MongoDB](https://www.mongodb.com/try/download/community) (local installation or MongoDB Atlas account)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android Studio / Xcode (for mobile development/emulation)

## Setup Instructions

### 1. Backend Setup

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory based on `.env.example`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jobease
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
CORS_ORIGIN=*
APP_URL=http://localhost:8081

# For Email SMTP setup
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="JobEase Support <your-email@gmail.com>"

# Integrations
NAUKRI_ENCRYPTION_KEY=your-32-character-secret-key-here
GEMINI_API_KEY=your-google-gemini-api-key
```

Start the backend server (starts on `http://localhost:3000`):

```bash
# Development Mode
npm run dev

# Production Mode
npm start
```

### 2. Frontend Setup (React Native)

Open a new terminal and navigate to the project root:

```bash
cd Jobease
npm install
```

Create a `.env` file in the project root to connect to the backend:

```env
# For Android emulator use: http://10.0.2.2:3000
# For iOS simulator use: http://localhost:3000
# For physical device use your local IP: http://192.168.1.100:3000
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Start the Expo development server:

```bash
npx expo start
```

You can then press `a` for Android emulator, `i` for iOS simulator, or scan the QR code using the Expo Go app on your physical device.

## Troubleshooting

- **Cannot connect to backend from the app**: Ensure the `EXPO_PUBLIC_API_URL` uses your machine's local IP address if testing on a physical device, and that your firewall allows connections on port 3000.
- **Port 3000 already in use**: You can change the port in the backend `.env` file and update the frontend `.env` to match.
- **MongoDB connection error**: Ensure your local MongoDB service is running, or verify your Atlas URI string in `.env`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
