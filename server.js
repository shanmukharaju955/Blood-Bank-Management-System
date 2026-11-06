const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

const db = require('./config/db');

// Import Route Handlers
const donorRoutes = require('./routes/donorRoutes');
const stockRoutes = require('./routes/stockRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// Middleware Configuration
// ==========================================
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management for Admin Authentication
app.use(session({
  name: 'blood_bank_session',
  secret: process.env.SESSION_SECRET || 'blood_bank_super_secret_session_key_2026_d7193f',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static Assets Serving
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API Routes
// ==========================================
app.use('/api/donors', donorRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);

// System Health & Diagnostics Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = db.getStatus();
  return res.status(200).json({
    status: 'ONLINE',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    app: 'Blood Bank Management System',
    version: '1.0.0'
  });
});

// ==========================================
// Friendly Page Routing
// ==========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'about.html'));
});

app.get('/donors', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'donors.html'));
});

app.get('/blood-stock', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'blood-stock.html'));
});

app.get('/request-blood', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'request-blood.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'contact.html'));
});

app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'admin-login.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pages', 'admin-dashboard.html'));
});

// ==========================================
// 404 & Global Error Handling
// ==========================================
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `Endpoint ${req.method} ${req.url} not found.` });
  }
  // Redirect unknown browser routes back to Home
  return res.redirect('/');
});

app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==========================================
// Start Web Server
// ==========================================
const server = app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Blood Bank Management System Server Running!`);
  console.log(`🌐 Local Web Portal: http://localhost:${PORT}`);
  console.log(`🔐 Admin Login URL: http://localhost:${PORT}/pages/admin-login.html`);
  console.log(`📊 Admin Credentials: admin / admin123`);
  console.log(`🩺 Health API: http://localhost:${PORT}/api/health`);
  console.log('========================================================');
});

module.exports = { app, server };
