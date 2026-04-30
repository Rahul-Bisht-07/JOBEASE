const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  portal: {
    type: String,
    default: 'Naukri',
    enum: ['Naukri'], // extend when more portals are added
  },
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  jobUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'applied', 'already_applied', 'external', 'captcha', 'failed'],
    default: 'pending',
  },
  failReason: { type: String },
  appliedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Application', ApplicationSchema);
