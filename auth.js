// Credentials (change these!)
const validUsers = {
  admin: 'admin123',
  user: 'password123'
};

function authenticate() {
  // First prompt for username
  const username = prompt('Enter your username:');
  if (username === null) return false; // User clicked cancel
  
  // Then prompt for password (hidden input)
  const password = prompt('Enter your password:\n\n(Input will be hidden)', '');
  if (password === null) return false; // User clicked cancel

  // Verify credentials
  if (validUsers[username] === password) {
    return true;
  } else {
    alert('Invalid username or password');
    return false;
  }
}

// Main authentication flow
document.addEventListener('DOMContentLoaded', () => {
  // Hide the page content initially
  document.body.style.visibility = 'hidden';
  
  // Keep asking until valid credentials are entered
  while (!authenticate()) {
    // Optional: limit number of attempts
    if (confirm('Authentication failed. Try again?')) continue;
    window.location.href = 'about:blank'; // Close page if user gives up
    return;
  }
  
  // Show content after successful auth
  document.body.style.visibility = 'visible';
});

// Extra security measures
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.ctrlKey && (e.key === 'u' || e.key === 's')) e.preventDefault();
});
