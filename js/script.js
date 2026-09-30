import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  multiFactor,
  TotpMultiFactorGenerator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setTotpChallenge } from "./totp-session.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

function showLoginStatus(message, type) {
  loginStatus.textContent = message;
  loginStatus.className = `login-status ${type}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasTotpFactor(user) {
  return multiFactor(user).enrolledFactors.some(
    (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!auth) {
      showLoginStatus("Firebase is not configured yet.", "error");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitButton = loginForm.querySelector("button[type='submit']");

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

      if (hasTotpFactor(user)) {
        window.location.href = "dashboard.html";
        return;
      }

      setTotpChallenge({ mode: "enroll", email });
      showLoginStatus("Open Google Authenticator to finish setup.", "success");
      window.location.href = "otp.html";
    } catch (error) {
      if (error.code === "auth/multi-factor-auth-required") {
        setTotpChallenge({ mode: "verify", email, password });
        showLoginStatus("Enter your authenticator code.", "success");
        window.location.href = "otp.html";
        return;
      }

      const message =
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-email"
          ? "Invalid input. Please check your email and password."
          : error.message || "Login failed. Please try again.";

      showLoginStatus(message, "error");
      console.error("Firebase login failed:", error);
    } finally {
      submitButton.disabled = false;
    }
  });
}
