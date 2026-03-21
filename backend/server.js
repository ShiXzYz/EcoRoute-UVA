const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const transitRoutes = require('./routes/transit');
const weatherRoutes = require('./routes/weather');
const carbonRoutes = require('./routes/carbon');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/transit', transitRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/carbon', carbonRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 EcoRoute server running on http://localhost:${PORT}`);
  console.log('📍 Open your browser to see the app');
});
