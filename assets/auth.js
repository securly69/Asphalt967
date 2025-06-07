// File: assets/auth.js
document.addEventListener('DOMContentLoaded', async () => {
  const hashed = '$2a$12$6NC5loSAXsEawBifrhg0x.GlsLZ4ikdlUw1Gmou0uJcRY1pdcpNga'
  const password = prompt('Enter secondary password:')
  if (!password) {
    alert('Password required')
    location.replace('about:blank')
    return
  }
  const match = await bcrypt.compare(password, hashed)
  if (!match) {
    alert('Incorrect password')
    location.replace('about:blank')
    return
  }
  try {
    const clip = await navigator.clipboard.readText()
    if (clip !== password) {
      alert('Clipboard check failed')
      location.replace('about:blank')
      return
    }
  } catch {
    alert('Clipboard access denied')
    location.replace('about:blank')
    return
  }
})
