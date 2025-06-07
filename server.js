import bcrypt from "bcryptjs"

document.addEventListener("DOMContentLoaded", async () => {
  const username = prompt("Username:")
  const password = prompt("Password:")
  const users = {
    admin: "$2a$12$KIXQjYpF8g/JQ6g0F6uG/.uF3c1O1VnQ8j1xZx8kC2Z6uQ9Y1A8Uy", // bcrypt hash of 'supersecret'
    adam:  "$2a$12$e0NRXkXzY0M5DzC0uV9q7u/3Q1bR1YpO9T8uJ2vL5P7cX6L3F4tWe", // hash for 'password1234'
    eve:   "$2a$12$Z1yX1Vx9G2h9O8dD3tQ4z.KuR5wN2yT6uH7jL1kM8nB5vC0pE9rAe"  // hash for 'asdfghjkl'
  }
  if (!users[username] || !await bcrypt.compare(password, users[username])) return location.replace("/")
  try {
    const clip = await navigator.clipboard.readText()
    if (clip !== password) throw ""
  } catch {
    return location.replace("/")
  }
})
