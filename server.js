const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Setup Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Configure EJS Views Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure Express Session (Memory Store for local deployments)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_session_secret_here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 1 day session lifetime
    }
  })
);

// Expose user session variables to all templates locally
const { exposeUserSession } = require('./middleware/authMiddleware');
app.use(exposeUserSession);

// Register Page Views & MVC Routers
const webRoutes = require('./routes/webRoutes');
const apiAuth = require('./routes/apiAuth');
const apiAdmin = require('./routes/apiAdmin');
const apiAgent = require('./routes/apiAgent');
const apiCustomer = require('./routes/apiCustomer');
const apiPackages = require('./routes/apiPackages');

app.use('/', webRoutes);
app.use('/api/auth', apiAuth);
app.use('/api/admin', apiAdmin);
app.use('/api/agent', apiAgent);
app.use('/api/customer', apiCustomer);
app.use('/api/packages', apiPackages);

// Handle 404 Route Errors
app.use((req, res, next) => {
  res.status(404).render('index', { 
    title: 'Page Not Found | TravelMate',
    user: req.session.user || null,
    error: 'The requested page does not exist.'
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('❌ Global Server Error Log:', err.stack);
  
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(500).json({ 
      success: false, 
      message: 'A critical backend exception occurred. Please try again later.' 
    });
  }
  
  res.status(500).send('Something went wrong on our end! Please contact system support.');
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`✨ TravelMate Travel Management System Active!`);
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
