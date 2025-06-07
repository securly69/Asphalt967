import basicAuth from 'express-basic-auth';
import config from './config.js';

// Custom unauthorized response
const unauthorizedResponse = (req) => {
  return req.auth
    ? `Credentials rejected for user: ${req.auth.user}`
    : 'Authentication required';
};

// Auth middleware
export const authMiddleware = (req, res, next) => {
  // Skip auth if disabled in config
  if (!config.authEnabled) return next();
  
  // Skip auth for public paths
  if (config.publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Apply basic auth
  basicAuth({
    users: config.users,
    challenge: true,
    unauthorizedResponse
  })(req, res, next);
};

// Simple self-test (optional)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Auth module self-test:');
  console.log('Configured users:', Object.keys(config.users));
}
