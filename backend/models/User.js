const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    profile: {
      phone: String,
      location: String,
      bio: String,
      skills: [String],
      experience: [
        {
          title: String,
          company: String,
          startDate: Date,
          endDate: Date,
          current: Boolean,
          description: String,
        },
      ],
      education: [
        {
          degree: String,
          institution: String,
          field: String,
          graduationYear: Number,
        },
      ],
    },
    preferences: {
      jobTypes: [String], // e.g., ['Full-time', 'Part-time', 'Contract']
      locations: [String],
      industries: [String],
      salaryRange: {
        min: Number,
        max: Number,
      },
    },
    resume: {
      url: String, // storage location or external URL
      originalName: String,
      uploadedAt: Date,
      size: Number,
      mimeType: String,
    },
    resumeScore: {
      overall: { type: Number, default: 0 },
      breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
      analyzedAt: Date,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // OTP-based reset
    resetOtpHash: String,
    resetOtpExpire: Date,
    resetOtpAttempts: {
      type: Number,
      default: 0,
    },
    // Naukri portal integration (cookie-based auth)
    naukriPortal: {
      cookiesEncrypted: { type: String },  // AES-256-CBC encrypted JSON cookies
      naukriEmail: { type: String },       // Display-only (extracted from session)
      linkedAt: { type: Date },
      expiresAt: { type: Date },           // When cookies are expected to expire
      isActive: { type: Boolean, default: false },
      dailyApplyLimit: { type: Number, default: 20 },
    },
    // Auto-Apply AI Bot Profile (Free-form JSON object for Gemini to read)
    botProfile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


