document.addEventListener("DOMContentLoaded", async () => {
  const pwd = prompt("Enter secondary password:")
  if (!pwd) return location.replace("/")
  const hashed = "$2a$12$6NC5loSAXsEawBifrhg0x.GlsLZ4ikdlUw1Gmou0uJcRY1pdcpNga"
  const ok = await bcrypt.compare(pwd, hashed)
  if (!ok) return location.replace("/")
  try {
    const clip = await navigator.clipboard.readText()
    if (clip !== pwd) throw ""
  } catch {
    return location.replace("/")
  }
})
