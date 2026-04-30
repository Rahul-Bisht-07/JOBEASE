# JobEase Setup Guide

## 🚀 Quick Start

This guide will help you set up both the frontend (React Native) and backend (Node.js/MongoDB) for the JobEase application.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local installation or MongoDB Atlas account)
- Expo CLI (optional, but recommended)
- Android Studio / Xcode (for mobile development)

## Frontend Setup (React Native)

### 1. Navigate to the project root
```bash
cd Jobease
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm start
# or
npx expo start
```

### 4. Run on your device/emulator
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

### 5. Configure the mobile app API URL

Create a `.env` file in the project root (same folder as `package.json`) and add:

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Replace `192.168.1.100` with your computer's LAN IP (check with `ipconfig`).

- **iOS simulator** can use `http://localhost:3000`
- **Android emulator** can use `http://10.0.2.2:3000`
- **Physical device** must use your computer's LAN IP

After changing the `.env`, restart Expo (`npx expo start --clear`).

## Backend Setup (Node.js/MongoDB)

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up MongoDB

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service:
   ```bash
   # macOS/Linux
   mongod
   
   # Windows
   net start MongoDB
   ```

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string

### 4. Configure environment variables

Create a `.env` file in the `backend` directory:

```env
PORT=3000
NODE_ENV=development

# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/jobease

# For MongoDB Atlas (replace with your connection string)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobease?retryWrites=true&w=majority

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=*
```

### 5. Start the backend server

#### Development mode (with auto-restart):
```bash
npm run dev
```

#### Production mode:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Testing the Setup

### 1. Test Backend API
Open your browser and visit:
- `http://localhost:3000` - Should show API welcome message
- `http://localhost:3000/api/health` - Should show health status

### 2. Test Frontend
- Open the app in Expo
- You should see the Welcome screen
- Try navigating to Login/Signup screens

### 3. Test Authentication
1. Create an account via Signup screen
2. Login with your credentials
3. You should be redirected to the Home screen

## Project Structure

```
Jobease/
├── app/                      # React Native app (Expo Router)
│   ├── (auth)/              # Authentication screens
│   │   ├── welcome.tsx      # Landing/Welcome screen
│   │   ├── login.tsx        # Login screen
│   │   ├── signup.tsx       # Signup screen
│   │   └── _layout.tsx      # Auth layout
│   ├── (tabs)/              # Main app screens
│   │   ├── index.tsx        # Home screen
│   │   └── _layout.tsx      # Tabs layout
│   ├── constants/           # Shared constants
│   │   └── theme.ts         # Colors, spacing, typography
│   └── index.tsx            # Root/index screen
├── backend/                 # Node.js backend
│   ├── config/              # Configuration files
│   ├── controllers/         # Route controllers
│   ├── middleware/          # Express middleware
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   └── server.js            # Main server file
└── package.json
```

## Troubleshooting

### Frontend Issues

**Issue**: "Cannot connect to backend"
- Make sure backend server is running
- Confirm `EXPO_PUBLIC_API_URL` in your `.env` points to the backend
- Restart Expo after changing `.env`
- For Android emulator, use `10.0.2.2:3000` instead of `localhost:3000`
- For physical device, use your computer's local IP address

**Issue**: "Expo Go app not loading"
- Make sure phone and computer are on same WiFi network
- Try restarting Expo dev server
- Clear Expo Go app cache

### Backend Issues

**Issue**: "MongoDB connection error"
- Make sure MongoDB is running (if using local)
- Check MONGODB_URI in .env file
- Verify MongoDB Atlas cluster is accessible (if using cloud)

**Issue**: "Port already in use"
- Change PORT in .env file
- Kill process using port 3000:
  ```bash
  # macOS/Linux
  lsof -ti:3000 | xargs kill
  
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

## Next Steps

1. ✅ Complete authentication flow
2. ⬜ Add user profile management
3. ⬜ Implement job search functionality
4. ⬜ Add resume upload and parsing
5. ⬜ Build recommendation engine
6. ⬜ Add application tracking

## Development Tips

- Use React Native Debugger for debugging
- Check backend logs in terminal for API errors
- Use Expo DevTools for app inspection
- Enable "Remote JS Debugging" in Expo for better error messages

## Need Help?

- Check the backend README.md for API documentation
- Review the code comments in each file
- Make sure all dependencies are installed correctly
- Verify your MongoDB connection is working

Happy coding! 🎉


