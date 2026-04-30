const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: true,
        unique: true,
    },
    source: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        index: true,
    },
    location: {
        type: String,
        default: 'Remote',
    },
    salary: {
        type: String,
    },
    experience: {
        type: String,
    },
    logo: {
        type: String,
    },
    description: {
        type: String,
    },
    // Naukri job detail fields
    industry: { type: String },
    department: { type: String },
    role: { type: String },
    employmentType: { type: String },
    education: { type: String },
    companyAbout: { type: String },
    companyHq: { type: String },
    scrapedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// Index for search
JobSchema.index({ title: 'text', company: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Job', JobSchema);
