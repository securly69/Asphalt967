const users = {
  admin: 'admin123', // Change these!
  user: 'password123'
};

function checkAuth() {
  const storedAuth = localStorage.getItem('basic-auth');
  if (storedAuth) {
    const [username, password] = atob(storedAuth).split(':');
    if (users[username] === password) return true;
  }

  const credentials = prompt('Enter username:password');
  if (!credentials) return false;

  const [username, password] = credentials.split(':');
  if (users[username] === password) {
    localStorage.setItem('basic-auth', btoa(credentials));
    return true;
  }

  alert('Invalid credentials');
  return false;
}

// Protect the entire site
if (!checkAuth()) {
  document.body.innerHTML = '<h1>Access Denied</h1>';
  throw new Error('Authentication failed');
}
