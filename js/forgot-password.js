import { auth } from "./firebase-config.js";
import {
    deleteUser,
    getAdditionalUserInfo,
    getMultiFactorResolver,
    isSignInWithEmailLink,
    multiFactor,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signOut,
    TotpMultiFactorGenerator,
    updatePassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getPasswordRequirementResults } from "./password-requirements.js";

const EMAIL_KEY = "tileDepotRecoveryEmail";
const emailForm = document.getElementById("emailForm");
const emailInput = document.getElementById("recoveryEmail");
const emailSubmit = document.getElementById("emailSubmit");
const emailCopy = document.getElementById("emailCopy");
const emailStatus = document.getElementById("emailStatus");
const totpStatus = document.getElementById("totpStatus");
const passwordStatus = document.getElementById("passwordStatus");
const otpInputs = Array.from(document.querySelectorAll("#recoveryOtp input"));
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const steps = ["emailStep", "totpStep", "passwordStep", "successStep"];

let recoveryResolver = null;
let totpHint = null;
let emailLinkPending = false;
let recoveryVerified = false;

function showStep(stepId) {
    steps.forEach((id) => {
        document.getElementById(id).hidden = id !== stepId;
    });
}

function setStatus(element, message, type = "error") {
    element.textContent = message;
    element.className = `recovery-status ${type === "success" ? "success" : ""}`;
}

function getRecoveryErrorMessage(error) {
    if (error.code === "auth/quota-exceeded" || error.code === "auth/too-many-requests") {
        return "Firebase temporarily limited recovery emails for this project. Wait before trying again, then check Firebase Console Authentication usage and quotas if it continues.";
    }

    if (error.code === "auth/operation-not-allowed") {
        return "Email Link sign-in must be enabled in Firebase Authentication before password recovery can be used.";
    }

    return error.message || "Could not send the secure sign-in link.";
}

function getTotpHint(resolver) {
    return resolver.hints.find(
        (hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

function clearRecoveryEmail() {
    localStorage.removeItem(EMAIL_KEY);
}

function cleanEmailLinkFromAddressBar() {
    window.history.replaceState({}, document.title, window.location.pathname);
}

function showAuthenticator(resolver) {
    const hint = getTotpHint(resolver);
    if (!hint) {
        throw new Error("No Google Authenticator factor is enrolled on this account.");
    }

    recoveryResolver = resolver;
    totpHint = hint;
    showStep("totpStep");
    otpInputs[0]?.focus();
}

async function finishEmailLink(email) {
    const button = emailSubmit;
    button.disabled = true;
    setStatus(emailStatus, "Verifying your secure link...", "success");

    try {
        let credential = null;
        try {
            credential = await signInWithEmailLink(auth, email, window.location.href);
        } catch (error) {
            if (error.code !== "auth/multi-factor-auth-required") {
                throw error;
            }

            const resolver = getMultiFactorResolver(auth, error);
            clearRecoveryEmail();
            cleanEmailLinkFromAddressBar();
            showAuthenticator(resolver);
            return;
        }

        cleanEmailLinkFromAddressBar();
        clearRecoveryEmail();

        if (getAdditionalUserInfo(credential)?.isNewUser) {
            await deleteUser(credential.user);
            throw new Error("This recovery link is not associated with an existing account.");
        }

        await signOut(auth);
        throw new Error("Firebase did not require Google Authenticator for this sign-in. Password recovery has been stopped.");
    } catch (error) {
        setStatus(emailStatus, error.message || "The secure link could not be verified.");
        showStep("emailStep");
    } finally {
        button.disabled = false;
    }
}

emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();

    if (emailLinkPending) {
        await finishEmailLink(email);
        return;
    }

    emailSubmit.disabled = true;
    setStatus(emailStatus, "Sending secure sign-in link...", "success");

    try {
        const actionCodeSettings = {
            url: `${window.location.origin}${window.location.pathname}`,
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        localStorage.setItem(EMAIL_KEY, email);
        emailCopy.textContent = "Check your inbox and open the secure sign-in link on this device. We will then ask for your Google Authenticator code.";
        emailSubmit.textContent = "Send link again";
        setStatus(emailStatus, "Secure link sent. Check your email.", "success");
    } catch (error) {
        setStatus(emailStatus, getRecoveryErrorMessage(error));
    } finally {
        emailSubmit.disabled = false;
    }
});

otpInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(-1);
        if (input.value && otpInputs[index + 1]) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && otpInputs[index - 1]) {
            otpInputs[index - 1].focus();
        }
    });

    input.addEventListener("paste", (event) => {
        const digits = (event.clipboardData?.getData("text") || "")
            .replace(/\D/g, "")
            .slice(0, otpInputs.length);
        if (!digits) return;

        event.preventDefault();
        otpInputs.forEach((otpInput, inputIndex) => {
            otpInput.value = digits[inputIndex] || "";
        });
        otpInputs[Math.min(digits.length, otpInputs.length) - 1]?.focus();
    });
});

document.getElementById("totpForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = otpInputs.map((input) => input.value).join("");

    if (code.length !== 6) {
        setStatus(totpStatus, "Enter all six digits from Google Authenticator.");
        return;
    }

    try {
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
        await recoveryResolver.resolveSignIn(assertion);
        recoveryVerified = true;
        showStep("passwordStep");
        newPasswordInput.focus();
    } catch (error) {
        setStatus(totpStatus, error.code === "auth/invalid-verification-code"
            ? "That code is invalid or expired. Enter the latest code from your app."
            : error.message || "Could not verify the authenticator code.");
    }
});

function passwordMeetsRequirements(value) {
    const results = getPasswordRequirementResults(value).map(({ id, met }) => {
        document.getElementById(id).classList.toggle("met", met);
        return met;
    });
    return results.every(Boolean);
}

newPasswordInput.addEventListener("input", () => {
    passwordMeetsRequirements(newPasswordInput.value);
    if (passwordStatus.textContent) {
        setStatus(passwordStatus, "");
    }
});

document.getElementById("passwordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = newPasswordInput.value;

    if (!recoveryVerified || !auth.currentUser) {
        setStatus(passwordStatus, "Authenticator verification expired. Start password recovery again.");
        return;
    }
    if (!passwordMeetsRequirements(password)) {
        setStatus(passwordStatus, "Meet every password requirement before continuing.");
        return;
    }
    if (password !== confirmPasswordInput.value) {
        setStatus(passwordStatus, "The passwords do not match.");
        return;
    }

    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    try {
        await updatePassword(auth.currentUser, password);
        await signOut(auth);
        showStep("successStep");
        window.setTimeout(() => {
            window.location.href = "index.html";
        }, 2200);
    } catch (error) {
        setStatus(passwordStatus, error.message || "Could not save the new password.");
    } finally {
        button.disabled = false;
    }
});

if (isSignInWithEmailLink(auth, window.location.href)) {
    const savedEmail = localStorage.getItem(EMAIL_KEY);
    if (savedEmail) {
        emailInput.value = savedEmail;
        finishEmailLink(savedEmail);
    } else {
        emailLinkPending = true;
        emailCopy.textContent = "Enter the same email address that received this secure link to continue.";
        emailSubmit.textContent = "Verify secure link";
        setStatus(emailStatus, "", "success");
        emailInput.focus();
    }
}
