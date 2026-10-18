import { auth } from "./firebase-config.js";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
  multiFactor,
  TotpMultiFactorGenerator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { isRememberedTotpSession } from "./remember-browser.js";
import {
  consumeExplicitLogout,
  getRememberedBrowserExpiry,
  hasRememberedBrowser,
  markRememberNoticePending,
  setTotpChallenge,
  TOTP_REAUTH_REQUIRED_KEY,
} from "./totp-session.js";

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

function showLoginStatus(message, type) {
  loginStatus.textContent = message;
  loginStatus.className = `login-status ${type}`;
}

const reauthMessage = sessionStorage.getItem(TOTP_REAUTH_REQUIRED_KEY);
if (reauthMessage) {
  showLoginStatus(reauthMessage, "error");
  sessionStorage.removeItem(TOTP_REAUTH_REQUIRED_KEY);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasTotpFactor(user) {
  return multiFactor(user).enrolledFactors.some(
    (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
}

function waitForInitialUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, () => resolve(null));
  });
}

async function ensureAuthPersistenceForRememberedBrowser() {
  if (hasRememberedBrowser() && getRememberedBrowserExpiry()) {
    await setPersistence(auth, browserLocalPersistence);
  }
}

async function redirectIfRememberedSession(user, email) {
  if (!(await isRememberedTotpSession(user))) return false;

  if (email && user.email?.toLowerCase() !== email.toLowerCase()) {
    return false;
  }

  markRememberNoticePending();
  window.location.replace("dashboard.html");
  return true;
}

const initialUserPromise = waitForInitialUser();
initialUserPromise.then(async (user) => {
  // After logout, stay on the login screen once — but the Firebase session
  // stays alive when "remember this browser" is active.
  if (consumeExplicitLogout()) return;
  await redirectIfRememberedSession(user);
}).catch((error) => {
  console.error("Could not restore remembered sign-in:", error);
});

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
      await ensureAuthPersistenceForRememberedBrowser();

      const existingUser = auth.currentUser || (await initialUserPromise);
      const sameAccount =
        Boolean(existingUser?.email) &&
        existingUser.email.toLowerCase() === email.toLowerCase();

      // Remembered logout left the session signed in: skip TOTP for this account.
      if (sameAccount && (await redirectIfRememberedSession(existingUser, email))) {
        return;
      }

      // Different account: sign out the remembered session, but do NOT clear
      // the 30-day browser timer — it keeps running for this device.
      if (existingUser && !sameAccount) {
        await signOut(auth);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Login failed. Please try again.");
      }

      if (await redirectIfRememberedSession(user, email)) {
        return;
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
