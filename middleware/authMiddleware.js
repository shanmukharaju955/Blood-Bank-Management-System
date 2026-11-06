/**
 * Authentication Middleware for Admin Protection
 * Validates session-based admin authorization
 */

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }

  // Handle API vs HTML requests
  if (req.path.startsWith('/api/') || req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please authenticate as an administrator to proceed.'
    });
  }

  // Redirect web browser requests to admin login
  return res.redirect('/pages/admin-login.html?error=session_expired');
}

module.exports = {
  requireAdmin
};
