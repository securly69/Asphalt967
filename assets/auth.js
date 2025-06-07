// assets/auth.js

const HASHED_PW = '$2a$12$6NC5loSAXsEawBifrhg0x.GlsLZ4ikdlUw1Gmou0uJcRY1pdcpNga';

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('auth-overlay');
  const form    = document.getElementById('auth-form');
  const input   = document.getElementById('auth-password');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const pwd = input.value;

    // 1) bcrypt compare
    const ok = await bcrypt.compare(pwd, HASHED_PW);
    if (!ok) {
      alert('Incorrect password');
      input.value = '';
      return;
    }

    // 2) clipboard check
    try {
      const clip = await navigator.clipboard.readText();
      if (clip !== pwd) {
        alert('Clipboard check failed');
        return;
      }
    } catch (err) {
      alert('Clipboard access denied');
      return;
    }

    // both passed → remove overlay
    overlay.remove();
  });
});
