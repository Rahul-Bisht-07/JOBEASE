const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const { runScraper } = require('./scheduler');

dotenv.config();

const seed = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Starting one-time scrape...');
        await runScraper();
        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
