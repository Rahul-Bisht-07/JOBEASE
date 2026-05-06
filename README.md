# JOBEASE : Applying made easy

![JobEase](https://img.shields.io/badge/JobEase-React_Native-blue.svg) ![Backend](https://img.shields.io/badge/Backend-Node.js_Express-green.svg) ![License](https://img.shields.io/badge/License-MIT-yellow.svg)

JobEase is an automated job application and tracking system designed to make the job application process seamless. It consists of a **React Native mobile app** (Expo) and a **Node.js/Express backend** that handles user authentication, Naukri job scraping, Gemini AI-powered auto-apply, resume scoring, and application tracking.

---

## Features

- **User Authentication** — Sign Up, Login, and Forgot Password via JWT + email links
- **Naukri Integration** — Browse, queue, and auto-apply to jobs on Naukri using session cookies
- **AI Auto-Apply** — Google Gemini AI answers recruiter chatbot questions automatically during Naukri application
- **Resume Scoring** — Analyses uploaded PDF/DOCX resumes and gives an ATS score out of 100
- **Application Tracker** — Track all applied, queued, and rejected applications
- **Cross-Platform** — React Native app runs on Android and iOS via Expo

---

## Project Structure

```
Jobease/
├── app/                      # React Native app (Expo Router)
│   ├── (auth)/              # Authentication screens (Welcome, Login, Signup, Forgot Password)
│   ├── (tabs)/              # Main app tabs (Discover, Portals, Tracker, Profile)
│   ├── job/                 # Job detail screen
│   ├── naukri/              # Naukri portal screens (Browse, Queue, Applications, Link)
│   └── index.tsx            # Root/splash screen
├── backend/                 # Node.js backend
│   ├── config/              # MongoDB connection
│   ├── controllers/         # Auth and user controllers
│   ├── middleware/          # JWT auth, input validation
│   ├── models/              # Mongoose models: User, Job, Application
│   ├── naukri/              # Naukri scraper, applier, encryption modules
│   ├── routes/              # API route definitions
│   ├── utils/               # Resume scorer, email helper
│   ├── scheduler.js         # Daily cron job for Naukri scraping
│   └── server.js            # Express server entry point
└── docs/                    # Project documentation
```

---

## Prerequisites

Make sure you have the following installed before starting:

| Tool | Version | Link |
|------|---------|------|
| Node.js | v18 or higher | https://nodejs.org |
| npm | Comes with Node.js | — |
| MongoDB | Local or Atlas | https://www.mongodb.com |
| Expo Go (mobile) | Latest | Android / iOS app store |
| Android Studio | For emulator (optional) | https://developer.android.com/studio |
| Xcode | For iOS simulator (Mac only) | Mac App Store |

> **Note on Puppeteer**: The backend uses Puppeteer (headless browser) to automate Naukri. It automatically downloads a compatible Chromium browser when you run `npm install`. No additional installation needed on Windows/Mac. On Ubuntu/Debian Linux servers, you may need to install extra system dependencies — run `npx puppeteer browsers install chrome` if Chromium fails to launch.

---

## Setup Instructions

### Step 1 — Clone the repository

```bash
git clone https://github.com/Rahul-Bisht-07/JOBEASE.git
cd JOBEASE
```

---

### Step 2 — Backend Setup

Navigate to the `backend` folder and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory. You can copy `.env.example` as a starting point:

```bash
cp .env.example .env   # Mac/Linux
copy .env.example .env  # Windows
```

Then fill in the values:

```env
PORT=3000
NODE_ENV=development

# MongoDB — local or Atlas
MONGODB_URI=mongodb://localhost:27017/jobease

# JWT Secret — any long random string
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d

CORS_ORIGIN=*

# Used in password reset email links — set to your Expo dev server URL
APP_URL=http://localhost:8081

# Gmail SMTP — for sending password reset emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-gmail-app-password
SMTP_FROM="JobEase Support <your-email@gmail.com>"

# Naukri AES-256 encryption key (you create this — any 32+ character string)
NAUKRI_ENCRYPTION_KEY=MyS3cur3Naukr1Key@JobEase#2026!!

# Google Gemini API key (for AI auto-apply chatbot)
GEMINI_API_KEY=your-google-gemini-api-key
```

> ### ℹ️ Environment Variable Notes
>
> **`JWT_SECRET`** — Any long random string (like a strong password). Used to sign auth tokens. Never share it.
>
> **`APP_URL`** — The base URL for your Expo frontend. Used in password reset email links so the deep-link goes to the right place. Use `http://localhost:8081` for local dev, or your deployed URL in production.
>
> **`SMTP_PASS` (Gmail App Password)** — You must use a Gmail **App Password**, not your regular Gmail password.
> To generate one:
> 1. Enable **2-Factor Authentication** on your Gmail account at [myaccount.google.com](https://myaccount.google.com/security)
> 2. Go to **Security → App Passwords**
> 3. Select app: **Mail**, device: **Other** → name it "JobEase"
> 4. Copy the 16-character password (no spaces) into `SMTP_PASS`
>
> **`NAUKRI_ENCRYPTION_KEY`** — A secret key you create yourself. Used to AES-256 encrypt users' Naukri session cookies stored in the database. **Must be at least 32 characters long.** Use any random combination of letters, numbers, and symbols.
> ```
> # Example (replace with your own):
> NAUKRI_ENCRYPTION_KEY=MyS3cur3Naukr1Key@JobEase#2026!!
> ```
>
> **`GEMINI_API_KEY`** — Your Google Gemini API key. Used by the AI to automatically answer recruiter chatbot questions during Naukri applications. The app uses the `gemini-2.5-flash` model. Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).

Start the backend server:

```bash
# Development mode (auto-restarts on file change — uses nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`. You can verify it's running by visiting:
- `http://localhost:3000` → should show `"JobEase API is running"`
- `http://localhost:3000/api/health` → should show `"Server is healthy"`

---

### Step 3 — Frontend Setup (React Native)

Open a **new terminal** and go to the project root:

```bash
cd JOBEASE
npm install
```

Create a `.env` file in the **project root** (same folder as `package.json`):

```env
# Point this to your backend server
# Android Emulator:   http://10.0.2.2:3000
# iOS Simulator:      http://localhost:3000
# Physical Device:    http://<your-local-ip>:3000  (check with ipconfig / ifconfig)
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Start the Expo development server:

```bash
npx expo start
```

Then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (Mac only)
- Scan the QR code with the **Expo Go** app on your phone (phone and laptop must be on the same WiFi)

> **After changing `.env`**, always restart Expo with `npx expo start --clear` to avoid cached values.

---

## How to Use JobEase (First-Time Guide)

Once both the backend and frontend are running, follow these steps to start automating your job applications:

1. **Create an Account**: Open the Expo app, sign up with your email and password, and log in.
2. **Link Your Naukri Account**: Go to the **Portals** tab, select **Link Naukri**, and securely enter your Naukri username and password. This allows the backend to authenticate and generate a session cookie for job applications.
3. **Ensure Naukri Profile is Complete**: The Gemini AI uses your Naukri profile details to automatically answer recruiter questions (such as years of experience, current CTC, etc.). Make sure your Naukri profile and resume are fully up to date on their website.
4. **Upload Your Resume**: Head to the **Profile** tab to upload your latest resume. The ATS checker will score your resume out of 100 and provide improvement feedback.
5. **Discover Jobs**: Open the **Discover** tab. The app will scrape and display recommended jobs directly tailored to your Naukri profile.
6. **Queue Jobs**: Swipe right on jobs you are interested in (or tap to view details and add them to the queue). These jobs are saved to your local database.
7. **Start Auto-Apply**: Go to the **Tracker** tab (which tracks your Queued, Applied, and Rejected jobs). Tap the **Start Applying** button under the Queued section. 
8. **Let the Automation Work**: The backend will spin up a Puppeteer browser, navigate to Naukri, answer chatbot questions using Gemini AI, and submit your applications. You can track the live progress directly in the app!

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to backend` from the app | Use your local IP in `EXPO_PUBLIC_API_URL`, not `localhost` (physical device) |
| `Port 3000 already in use` | Change `PORT` in backend `.env` and update frontend `.env` accordingly |
| `MongoDB connection error` | Check if MongoDB is running locally, or verify your Atlas URI |
| `Puppeteer / Chromium not found` | Run `npx puppeteer browsers install chrome` in the `backend` directory |
| `Invalid NAUKRI_ENCRYPTION_KEY` error | Make sure the key is at least 32 characters long in your backend `.env` |
| Password reset emails not sending | Verify `SMTP_PASS` is a Gmail App Password (not your Gmail login password) |
| Expo app showing blank screen | Run `npx expo start --clear` to clear the Expo cache |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native, Expo Router, TypeScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Automation | Puppeteer, puppeteer-extra-plugin-stealth |
| Resume Parsing | pdf-parse, mammoth |
| Email | Nodemailer, Gmail SMTP |
| Scheduling | node-cron |

---

## Notes & Known Limitations

### 👁️ Watching the Auto-Apply Browser in Real Time

By default, Puppeteer runs the automation browser **in the background** (headless mode) so no window pops up. If you want to **watch the browser apply to jobs in real time**, open:

```
backend/naukri/applier.js  →  Line 64
```

Change:
```js
headless: true,
```
to:
```js
headless: false,
```

A real Chrome/Chromium browser window will now open when you trigger an auto-apply batch, and you can observe every step live.

---

### ⚠️ Gemini API Free Tier Quota

The auto-apply feature uses the **Google Gemini API** (`gemini-2.5-flash`) to intelligently answer recruiter chatbot questions during applications. The **free tier has a limited request quota** (requests per minute and per day), which means:

- If you are applying to many jobs in one batch, you may hit the quota limit.
- When the quota is exceeded, Gemini calls will fail silently and the chatbot question will be skipped.
- You will see an error like `[Gemini API Error] 429 Resource exhausted` in the backend logs.

**Workarounds:**
- Apply in smaller batches.
- Upgrade to a paid Gemini API plan for higher limits.
- Or wait for upcoming improvements listed below.

---

## 🚧 Upcoming Features

This project is actively being developed. Planned improvements include:

- **Gemini Response Caching** — Cache common chatbot question answers to reduce API calls and avoid quota limits.
- **Locally Running LLM** — Support for running a local LLM (e.g. Ollama with Mistral/LLaMA) instead of the Gemini API, so auto-apply works completely offline and without any quota restrictions.
- **More Job Portals** — Expanding beyond Naukri to other platforms.
- **Smarter Resume Matching** — AI-based job-to-resume relevance scoring before applying.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
