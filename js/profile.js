import { auth } from "./firebase-config.js";
import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    updatePassword,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { buildProfileName, formatProfileName, parseProfileName } from "./profile-name.js";
import { getPasswordRequirementResults } from "./password-requirements.js";

const nameForm = document.getElementById("nameForm");
const passwordForm = document.getElementById("passwordForm");
const profileEmail = document.getElementById("profileEmail");
const lastNameInput = document.getElementById("lastName");
const firstNameInput = document.getElementById("firstName");
const middleNameInput = document.getElementById("middleName");
const nameStatus = document.getElementById("nameStatus");
const passwordStatus = document.getElementById("passwordStatus");
const newPasswordInput = document.getElementById("newPassword");
const profileNameLabel = document.querySelector(".profile-name");

function setStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = `profile-status ${type || ""}`.trim();
}

function formatDisplayName(user) {
    const name = formatProfileName(user?.displayName);
    if (name) return name;
    return (user?.email || "ACCOUNT").toUpperCase();
}

function syncTopbarName(user) {
    if (profileNameLabel) {
        profileNameLabel.textContent = formatDisplayName(user);
    }
}

function mapAuthError(error) {
    switch (error?.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Current password is incorrect.";
        case "auth/weak-password":
            return "New password must meet all the requirements listed above.";
        case "auth/requires-recent-login":
            return "For security, enter your current password and try again.";
        case "auth/multi-factor-auth-required":
            return "Authenticator verification is required. Sign out and sign in again, then retry.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait and try again.";
        default:
            return error?.message || "Could not update profile.";
    }
}

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

onAuthStateChanged(auth, (user) => {
    if (!user) return;

    if (profileEmail) {
        profileEmail.textContent = user.email || "—";
    }

    if (lastNameInput && firstNameInput && middleNameInput) {
        const name = parseProfileName(user.displayName);
        lastNameInput.value = name.lastName;
        firstNameInput.value = name.firstName;
        middleNameInput.value = name.middleName;
    }

    syncTopbarName(user);
});

nameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        setStatus(nameStatus, "You are not signed in.", "error");
        return;
    }

    const lastName = lastNameInput.value.trim();
    const firstName = firstNameInput.value.trim();
    const middleName = middleNameInput.value.trim();
    if (!lastName || !firstName) {
        setStatus(nameStatus, "Enter your last name and first name.", "error");
        return;
    }

    const displayName = buildProfileName({ lastName, firstName, middleName });
    const submitButton = nameForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    setStatus(nameStatus, "Saving name...", "loading");

    try {
        await updateProfile(user, { displayName });
        syncTopbarName(user);
        setStatus(nameStatus, "Name updated.", "success");
    } catch (error) {
        setStatus(nameStatus, mapAuthError(error), "error");
        console.error("Update name failed:", error);
    } finally {
        submitButton.disabled = false;
    }
});

passwordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    if (!user?.email) {
        setStatus(passwordStatus, "You are not signed in.", "error");
        return;
    }

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        setStatus(passwordStatus, "Fill in all password fields.", "error");
        return;
    }

    if (!passwordMeetsRequirements(newPassword)) {
        setStatus(passwordStatus, "New password must meet all the requirements listed above.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        setStatus(passwordStatus, "New passwords do not match.", "error");
        return;
    }

    if (currentPassword === newPassword) {
        setStatus(passwordStatus, "New password must be different from the current password.", "error");
        return;
    }

    const submitButton = passwordForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    setStatus(passwordStatus, "Updating password...", "loading");

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        passwordForm.reset();
        setStatus(passwordStatus, "Password updated.", "success");
    } catch (error) {
        setStatus(passwordStatus, mapAuthError(error), "error");
        console.error("Update password failed:", error);
    } finally {
        submitButton.disabled = false;
    }
});
