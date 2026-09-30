import { auth } from "./firebase-config.js";

const inputs = document.querySelectorAll(".otp-input");
const status = document.getElementById("verificationStatus");
const resendBtn = document.getElementById("resendBtn");
const emailElement = document.querySelector(".email");
const RESEND_DELAY_MS = 2 * 60 * 1000;
const COOLDOWN_KEY = "otpResendCooldownUntil";
let resendCooldownUntil = Number(sessionStorage.getItem(COOLDOWN_KEY)) || 0;
let hideStatusTimer = null;

function getTargetEmail() {
    const savedEmail = sessionStorage.getItem("verificationEmail") || "";
    const activeEmail = auth?.currentUser?.email || savedEmail;
    const finalEmail = activeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activeEmail.trim()) ? activeEmail.trim() : "";

    if (finalEmail) {
        sessionStorage.setItem("verificationEmail", finalEmail);
    } else {
        sessionStorage.removeItem("verificationEmail");
    }

    return finalEmail;
}

const email = getTargetEmail();

if (email && emailElement) {
    emailElement.textContent = `(${email})`;
} else if (emailElement) {
    emailElement.textContent = "(sign in again)";
}

function setResendButtonDisabled(isDisabled) {
    if (!resendBtn) return;

    resendBtn.setAttribute("aria-disabled", String(isDisabled));
    resendBtn.tabIndex = isDisabled ? -1 : 0;
    resendBtn.style.pointerEvents = isDisabled ? "none" : "auto";
    resendBtn.style.opacity = isDisabled ? "0.55" : "1";
}

function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function hideStatus() {
    if (!status) return;
    status.className = "message-container";
    status.innerHTML = "";
}

function updateResendButton() {
    if (!resendBtn) return;

    const remainingMs = Math.max(0, resendCooldownUntil - Date.now());

    if (remainingMs > 0) {
        resendBtn.textContent = `RESEND CODE (${formatCountdown(remainingMs)})`;
        setResendButtonDisabled(true);
        return;
    }

    resendBtn.textContent = "RESEND CODE";
    setResendButtonDisabled(false);
}

function tickResendCooldown() {
    updateResendButton();

    if (window.resendTimer) {
        clearInterval(window.resendTimer);
    }

    if (resendCooldownUntil <= Date.now()) {
        return;
    }

    window.resendTimer = setInterval(() => {
        updateResendButton();
        if (Date.now() >= resendCooldownUntil) {
            clearInterval(window.resendTimer);
        }
    }, 250);
}

function startResendCooldown() {
    resendCooldownUntil = Date.now() + RESEND_DELAY_MS;
    sessionStorage.setItem(COOLDOWN_KEY, String(resendCooldownUntil));
    tickResendCooldown();
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

async function sendOtpToEmail(targetEmail = email) {
    if (!targetEmail) {
        showStatus("No email found. Please log in again.", "error");
        return false;
    }

    const response = await fetch("http://localhost:3000/api/send-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
    });

    const data = await response.json();

    if (!response.ok) {
        showStatus(data.message || "Could not resend OTP.", "error");
        return false;
    }

    return true;
}

async function verifyOtp(code) {
    const targetEmail = getTargetEmail();

    if (!targetEmail) {
        throw new Error("No email found. Please log in again.");
    }

    const response = await fetch("http://localhost:3000/api/verify-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail, code }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Invalid OTP.");
    }

    return data;
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
    });
}

document.getElementById("verifyBtn")?.addEventListener("click", async () => {
    const code = Array.from(inputs).map((input) => input.value).join("");

    if (code.length !== 6) {
        showStatus("Please enter the six-digit code.", "error");
        return;
    }

    try {
        await verifyOtp(code);
        showStatus("Verification successful. Redirecting...", "success");
        sessionStorage.removeItem("verificationEmail");
        sessionStorage.removeItem(COOLDOWN_KEY);
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 800);
    } catch (error) {
        showStatus(error.message || "Invalid OTP.", "error");
    }
});

resendBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    if (Date.now() < resendCooldownUntil) {
        updateResendButton();
        return;
    }

    const currentEmail = getTargetEmail();
    if (!currentEmail) {
        showStatus("No email found. Please log in again.", "error");
        return;
    }

    setResendButtonDisabled(true);
    showStatus("Sending a new code...", "success");

    try {
        const sent = await sendOtpToEmail(currentEmail);
        if (!sent) {
            setResendButtonDisabled(false);
            return;
        }

        showStatus("Email has been re-sent.", "success");
        startResendCooldown();
    } catch (error) {
        setResendButtonDisabled(false);
        showStatus(error.message || "Could not resend OTP. Please try again.", "error");
    }
});

if (resendCooldownUntil > Date.now()) {
    tickResendCooldown();
} else if (!sessionStorage.getItem(COOLDOWN_KEY) && email) {
    startResendCooldown();
} else {
    updateResendButton();
}