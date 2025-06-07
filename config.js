export default {
  // Enable/disable authentication
  authEnabled: true,
  
  // User credentials (username: password)
  users: {
    admin: 'admin123',  // Change these!
    user: 'password123'
  },
  
  // Paths that bypass auth (optional)
  publicPaths: [
    '/assets/',
    '/favicon.ico'
  ]
};
