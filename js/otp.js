import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm";
import { auth } from "./firebase-config.js";
import {
    getMultiFactorResolver,
    multiFactor,
    onAuthStateChanged,
    browserLocalPersistence,
    browserSessionPersistence,
    sendEmailVerification,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
    TotpMultiFactorGenerator,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { isRememberedTotpSession } from "./remember-browser.js";
import {
    clearTotpChallenge,
    getRememberedBrowserExpiry,
    getTotpChallenge,
    markRememberNoticePending,
    rememberBrowserForThirtyDays,
    TOTP_REAUTH_REQUIRED_KEY,
    TOTP_PASSWORD_KEY,
} from "./totp-session.js";

const inputs = document.querySelectorAll(".otp-input");
const status = document.getElementById("verificationStatus");
const titleElement = document.querySelector(".otp-title");
const descriptionElement = document.querySelector(".otp-description");
const enrollPanel = document.getElementById("enrollPanel");
const totpQr = document.getElementById("totpQr");
const totpSecret = document.getElementById("totpSecret");
const rememberBrowserOption = document.getElementById("rememberBrowserOption");
const rememberBrowserCheckbox = document.getElementById("rememberBrowser");
const APP_NAME = "Tile Depot";

let hideStatusTimer = null;
let totpSecretObject = null;
let mfaResolver = null;
let totpHint = null;
let currentMode = "";

function waitForAuthUser() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

function hasTotpFactor(user) {
    return multiFactor(user).enrolledFactors.some(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

function hideStatus() {
    if (!status) return;
    status.className = "message-container";
    status.innerHTML = "";
}

function showStatus(message, type) {
    if (!status) return;

    if (hideStatusTimer) {
        clearTimeout(hideStatusTimer);
        hideStatusTimer = null;
    }

    const icon = type === "success" ? "✓" : "×";
    status.innerHTML = `
        <span class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span>${message}</span>
        </span>
        <button class="toast-close" type="button" aria-label="Close">×</button>
    `;
    status.className = `message-container show ${type}`;

    const closeBtn = status.querySelector(".toast-close");
    if (closeBtn) {
        closeBtn.addEventListener("click", hideStatus);
    }

    hideStatusTimer = setTimeout(hideStatus, 5000);
}

function setEnrollCopy(email) {
    if (titleElement) {
        titleElement.textContent = "Set Up Authenticator";
    }

    if (descriptionElement) {
        descriptionElement.innerHTML = `
            Scan the QR code in Google Authenticator, then enter the six-digit code
            <span class="email">${email ? `(${email})` : ""}</span>
            below.
        `;
    }

    enrollPanel?.classList.remove("is-hidden");
    rememberBrowserOption.hidden = false;
}

function setVerifyCopy(email) {
    if (titleElement) {
        titleElement.textContent = "Authenticator Code";
    }

    if (descriptionElement) {
        descriptionElement.innerHTML = `
            Enter the six-digit code from Google Authenticator
            <span class="email">${email ? `(${email})` : ""}</span>
            below. Codes refresh about every 30 seconds.
        `;
    }

    enrollPanel?.classList.add("is-hidden");
    rememberBrowserOption.hidden = false;
}

function mapTotpError(error) {
    const code = error?.code || "";

    if (code === "auth/totp-challenge-timeout") {
        return "Your sign-in challenge expired. Sign in again with your email and password.";
    }

    if (code === "auth/invalid-verification-code" || code === "auth/invalid-multi-factor-session") {
        return "Invalid or expired authenticator code. Try the newest six-digit code.";
    }

    if (code === "auth/unverified-email") {
        return "Verify this email address in Firebase Auth before using authenticator codes.";
    }

    if (code === "auth/operation-not-allowed" || code === "auth/unsupported-first-factor") {
        return "TOTP MFA is not enabled on smarthub-capstone-4b179. Enable Identity Platform TOTP MFA in Firebase Authentication.";
    }

    return error?.message || "Could not verify the authenticator code.";
}

async function startEnrollment(user) {
    currentMode = "enroll";
    setEnrollCopy(user.email || "");

    if (!user.emailVerified) {
        try {
            await sendEmailVerification(user);
        } catch (error) {
            console.warn("Could not send verification email:", error);
        }
    }

    const session = await multiFactor(user).getSession();
    totpSecretObject = await TotpMultiFactorGenerator.generateSecret(session);
    const totpUri = totpSecretObject.generateQrCodeUrl(user.email || APP_NAME, APP_NAME);

    if (totpQr) {
        totpQr.src = await QRCode.toDataURL(totpUri, { width: 180, margin: 1 });
        totpQr.alt = "Google Authenticator QR code";
    }

    if (totpSecret) {
        totpSecret.textContent = totpSecretObject.secretKey;
    }
}

async function startVerification(email, password) {
    currentMode = "verify";
    setVerifyCopy(email);

    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (hasTotpFactor(credential.user)) {
            clearTotpChallenge();
            window.location.href = "dashboard.html";
            return;
        }

        await startEnrollment(credential.user);
    } catch (error) {
        if (error.code !== "auth/multi-factor-auth-required") {
            throw error;
        }

        mfaResolver = getMultiFactorResolver(auth, error);
        totpHint = mfaResolver.hints.find(
            (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
        );

        if (!totpHint) {
            throw new Error("This account does not have a Google Authenticator factor yet.");
        }
    }
}

async function verifyAuthenticatorCode(code) {
    const rememberBrowser = Boolean(rememberBrowserCheckbox?.checked);
    // Keep local persistence for the whole active 30-day window so a later
    // account switch / logout does not wipe the trusted-browser session store.
    const keepTrustedBrowser = rememberBrowser || Boolean(getRememberedBrowserExpiry());
    await setPersistence(
        auth,
        keepTrustedBrowser ? browserLocalPersistence : browserSessionPersistence
    );

    if (currentMode === "enroll") {
        const user = auth.currentUser;
        if (!user || !totpSecretObject) {
            throw new Error("Authenticator setup is not ready. Sign in again.");
        }

        const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecretObject, code);
        await multiFactor(user).enroll(assertion, "Google Authenticator");
    } else {
        if (!mfaResolver || !totpHint) {
            throw new Error("Authenticator sign-in is not ready. Sign in again.");
        }

        const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
        await mfaResolver.resolveSignIn(assertion);
    }

    // Only start a window when checked. Never clear/reset an existing countdown
    // (signing into another account must not end the 30 days).
    if (rememberBrowser) {
        rememberBrowserForThirtyDays();
    }

    if (getRememberedBrowserExpiry()) {
        markRememberNoticePending();
    }
}

async function returnToLoginAfterChallengeTimeout() {
    clearTotpChallenge();
    sessionStorage.setItem(
        TOTP_REAUTH_REQUIRED_KEY,
        "Your sign-in challenge expired. Enter your email and password again."
    );

    try {
        await signOut(auth);
    } finally {
        window.location.replace("index.html");
    }
}

if (inputs.length) {
    inputs.forEach((input, index) => {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\D/g, "").slice(0, 1);

            if (input.value && inputs[index + 1]) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("paste", (event) => {
            const pasted = event.clipboardData?.getData("text") || "";
            const digits = pasted.replace(/\D/g, "").slice(0, inputs.length);

            if (!digits) {
                return;
            }

            event.preventDefault();
            inputs.forEach((otpInput, otpIndex) => {
                otpInput.value = digits[otpIndex] || "";
            });
            inputs[Math.min(digits.length, inputs.length) - 1].focus();
        });
    });
}

document.getElementById("backToLogin")?.addEventListener("click", async (event) => {
    event.preventDefault();
    clearTotpChallenge();
    try {
        await signOut(auth);
    } finally {
        window.location.href = "index.html";
    }
});

document.getElementById("verifyBtn")?.addEventListener("click", async () => {
    const code = Array.from(inputs).map((input) => input.value).join("");

    if (code.length !== 6) {
        showStatus("Please enter the six-digit code.", "error");
        return;
    }

    try {
        await verifyAuthenticatorCode(code);
        clearTotpChallenge();
        showStatus("Verification successful. Redirecting...", "success");
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 800);
    } catch (error) {
        if (error.code === "auth/totp-challenge-timeout") {
            await returnToLoginAfterChallengeTimeout();
            return;
        }

        showStatus(mapTotpError(error), "error");
    }
});

async function initTotpPage() {
    const challenge = getTotpChallenge();
    const user = await waitForAuthUser();

    try {
        if (
            user &&
            challenge.email &&
            user.email?.toLowerCase() === challenge.email.toLowerCase() &&
            (await isRememberedTotpSession(user))
        ) {
            clearTotpChallenge();
            window.location.replace("dashboard.html");
            return;
        }

        if (challenge.mode === "verify" && challenge.email && challenge.password) {
            await startVerification(challenge.email, challenge.password);
            sessionStorage.removeItem(TOTP_PASSWORD_KEY);
            return;
        }

        if (user && !hasTotpFactor(user)) {
            await startEnrollment(user);
            return;
        }

        if (user && hasTotpFactor(user)) {
            clearTotpChallenge();
            window.location.href = "dashboard.html";
            return;
        }

        window.location.href = "index.html";
    } catch (error) {
        if (error.code === "auth/totp-challenge-timeout") {
            await returnToLoginAfterChallengeTimeout();
            return;
        }

        showStatus(mapTotpError(error), "error");
        if (error.code === "auth/invalid-credential") {
            clearTotpChallenge();
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1600);
        }
    }
}

initTotpPage();
