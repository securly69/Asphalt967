// auth.js - Standalone authentication for static sites
document.addEventListener('DOMContentLoaded', function() {
  // Hide all page content immediately
  document.body.style.display = 'none';
  
  // Valid credentials (change these!)
  const validUsers = {
    admin: 'admin123',
    user: 'password123'
  };

  function showPasswordPrompt(username) {
    // Create password prompt with hidden input
    const form = document.createElement('div');
    form.style.position = 'fixed';
    form.style.top = '50%';
    form.style.left = '50%';
    form.style.transform = 'translate(-50%, -50%)';
    form.style.backgroundColor = 'white';
    form.style.padding = '20px';
    form.style.borderRadius = '5px';
    form.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    form.style.zIndex = '9999';
    
    form.innerHTML = `
      <h3 style="margin-top:0;">Enter Password for ${username}</h3>
      <input type="password" id="authPassword" placeholder="Password" 
             style="width:100%; padding:8px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between;">
        <button id="authSubmit" style="padding:5px 15px;">Submit</button>
        <button id="authCancel" style="padding:5px 15px;">Cancel</button>
      </div>
      <p id="authError" style="color:red; height:20px; margin:10px 0 0;"></p>
    `;
    
    document.body.appendChild(form);
    
    return new Promise((resolve) => {
      const passwordInput = document.getElementById('authPassword');
      passwordInput.focus();
      
      document.getElementById('authSubmit').addEventListener('click', () => {
        const password = passwordInput.value;
        document.body.removeChild(form);
        resolve(password);
      });
      
      document.getElementById('authCancel').addEventListener('click', () => {
        document.body.removeChild(form);
        resolve(null);
      });
    });
  }

  async function authenticate() {
    // First get username
    const username = prompt('Enter your username:');
    if (!username) return false;
    
    // Then get password with custom hidden input
    const password = await showPasswordPrompt(username);
    if (!password) return false;
    
    // Verify credentials
    if (validUsers[username] === password) {
      return true;
    } else {
      alert('Invalid credentials');
      return false;
    }
  }

  // Authentication flow
  (async function() {
    while (true) {
      if (await authenticate()) {
        // Show page content after successful auth
        document.body.style.display = '';
        break;
      } else if (!confirm('Authentication failed. Try again?')) {
        // Redirect if user cancels
        window.location.href = 'about:blank';
        break;
      }
    }
  })();
});
