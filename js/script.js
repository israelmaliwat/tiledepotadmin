import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

function showLoginStatus(message, type) {
  loginStatus.textContent = message;
  loginStatus.className = `login-status ${type}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendOtpToEmail(email) {
  const response = await fetch("http://localhost:3000/api/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to send OTP.");
  }

  return data;
}

if (loginForm) {
  loginForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!auth) {
      showLoginStatus("Firebase is not configured yet.", "error");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = loginForm.querySelector("button[type='submit']");

    sessionStorage.removeItem("verificationEmail");

    if (!email || !password || !isValidEmail(email) || password.length < 6) {
      showLoginStatus("Invalid input. Please check your email and password.", "error");
      return;
    }

    submitButton.disabled = true;
    showLoginStatus("Signing in...", "loading");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Login failed. Please try again.");
      }

      await sendOtpToEmail(email);
      sessionStorage.setItem("verificationEmail", email);
      sessionStorage.setItem("otpResendCooldownUntil", String(Date.now() + 2 * 60 * 1000));
      showLoginStatus("OTP sent to your email.", "success");
      window.location.href = "otp.html";
    } catch (error) {
      const message = error.code === "auth/invalid-credential"
        || error.code === "auth/user-not-found"
        || error.code === "auth/wrong-password"
        || error.code === "auth/invalid-email"
        ? "Invalid input. Please check your email and password."
        : error.message || "Login failed. Please try again.";

      showLoginStatus(message, "error");
      console.error("Firebase login failed:", error);
    } finally {
      submitButton.disabled = false;
    }
  });
}