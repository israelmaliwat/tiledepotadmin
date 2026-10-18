import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut, multiFactor, TotpMultiFactorGenerator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setTotpChallenge } from "./totp-session.js";
import { formatProfileName } from "./profile-name.js";
import {
    clearRememberedBrowser,
    consumeRememberNoticePending,
    getRememberedBrowserDaysRemaining,
    getRememberedBrowserExpiry,
    hasRememberedBrowser,
    markExplicitLogout,
} from "./totp-session.js";

let rememberExpiryTimer = null;
let rememberToastTimer = null;

function hasTotpFactor(user) {
    return multiFactor(user).enrolledFactors.some(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

function hideRememberToast(toast) {
    if (!toast) return;
    toast.classList.remove("is-visible");
    clearTimeout(rememberToastTimer);
    setTimeout(() => toast.remove(), 220);
}

function showRememberBrowserToast() {
    if (!consumeRememberNoticePending() || !hasRememberedBrowser()) return;

    const daysLeft = getRememberedBrowserDaysRemaining();
    if (!daysLeft) return;

    const existing = document.getElementById("rememberToast");
    if (existing) existing.remove();

    const dayLabel = daysLeft === 1 ? "day" : "days";
    const toast = document.createElement("div");
    toast.id = "rememberToast";
    toast.className = "remember-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = `
        <span class="remember-toast-check" aria-hidden="true">✓</span>
        <div class="remember-toast-copy">
            Browser remembered. <strong>${daysLeft} ${dayLabel}</strong> left —
            authenticator code not required on this device.
        </div>
        <button class="remember-toast-close" type="button" aria-label="Close">×</button>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));

    toast.querySelector(".remember-toast-close")?.addEventListener("click", () => {
        hideRememberToast(toast);
    });

    rememberToastTimer = setTimeout(() => hideRememberToast(toast), 7000);
}

async function checkRememberedBrowserExpiry() {
    if (!hasRememberedBrowser()) return;

    const expiresAt = getRememberedBrowserExpiry();
    if (!expiresAt) {
        clearRememberedBrowser();
        await signOut(auth);
        window.location.replace("index.html");
        return;
    }

    clearTimeout(rememberExpiryTimer);
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
        clearRememberedBrowser();
        await signOut(auth);
        window.location.replace("index.html");
        return;
    }

    rememberExpiryTimer = setTimeout(
        checkRememberedBrowserExpiry,
        Math.min(remaining, 2147483647)
    );
}

function formatProfileDisplayName(user) {
    const name = formatProfileName(user?.displayName);
    if (name) return name.toUpperCase();
    return (user?.email || "ACCOUNT").toUpperCase();
}

function syncTopbarDisplayName(user) {
    document.querySelectorAll(".profile-name").forEach((el) => {
        el.textContent = formatProfileDisplayName(user);
    });
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        clearTimeout(rememberExpiryTimer);
        window.location.replace("index.html");
        return;
    }

    await checkRememberedBrowserExpiry();
    if (!auth.currentUser) return;

    if (!hasTotpFactor(user)) {
        setTotpChallenge({ mode: "enroll", email: user.email || "" });
        window.location.replace("otp.html");
        return;
    }

    syncTopbarDisplayName(user);
    showRememberBrowserToast();
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        checkRememberedBrowserExpiry();
    }
});

window.logout = async function logout() {
    markExplicitLogout();

    // Keep Firebase session alive for the rest of the 30-day window so the
    // next sign-in on this browser can skip TOTP for the same account.
    if (hasRememberedBrowser()) {
        window.location.replace("index.html");
        return;
    }

    clearRememberedBrowser();
    try {
        await signOut(auth);
    } catch (error) {
        console.warn("Sign out failed:", error);
    }

    window.location.replace("index.html");
};
