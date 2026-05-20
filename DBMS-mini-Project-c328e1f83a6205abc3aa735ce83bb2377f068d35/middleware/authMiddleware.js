/**
 * Authentication Middleware for Role-Based Session Checking
 */

exports.requireAuth = (allowedRoles = []) => {
  return (req, res, next) => {
    // If roles is a string, convert to array
    const roles = typeof allowedRoles === 'string' ? [allowedRoles] : allowedRoles;

    // Check if session user exists
    if (!req.session || !req.session.user) {
      // For API/AJAX requests, return a JSON error instead of redirecting
      if (req.xhr || req.path.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized. Please log in first.' 
        });
      }
      return res.redirect('/login');
    }

    const user = req.session.user;

    // If allowed roles are specified, check if user's role matches
    if (roles.length > 0 && !roles.includes(user.role)) {
      if (req.xhr || req.path.startsWith('/api/') || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden. You do not have permission to perform this action.' 
        });
      }
      
      // Redirect unauthorized users to their respective home dashboard
      if (user.role === 'admin') return res.redirect('/admin/dashboard');
      if (user.role === 'agent') return res.redirect('/agent/dashboard');
      if (user.role === 'customer') return res.redirect('/customer/dashboard');
      
      return res.redirect('/login');
    }

    // Auth matches, proceed to route handler
    next();
  };
};

// Expose session variables to EJS templates locally (useful for dynamically displaying usernames and roles)
exports.exposeUserSession = (req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
};
