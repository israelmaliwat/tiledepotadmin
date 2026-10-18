export const TOTP_MODE_KEY = "tileDepotTotpMode";
export const TOTP_EMAIL_KEY = "tileDepotTotpEmail";
export const TOTP_PASSWORD_KEY = "tileDepotTotpPassword";
export const TOTP_REAUTH_REQUIRED_KEY = "tileDepotTotpReauthRequired";
export const REMEMBERED_BROWSER_KEY = "tileDepotRememberedBrowserUntil";
export const REMEMBERED_BROWSER_DURATION = 30 * 24 * 60 * 60 * 1000;
export const EXPLICIT_LOGOUT_KEY = "tileDepotExplicitLogout";
export const REMEMBER_NOTICE_KEY = "tileDepotShowRememberNotice";

/**
 * Start a 30-day remember window only if one is not already running.
 * Never resets an active countdown (e.g. after switching accounts).
 */
export function rememberBrowserForThirtyDays() {
    const existingExpiry = Number(localStorage.getItem(REMEMBERED_BROWSER_KEY));
    if (Number.isFinite(existingExpiry) && existingExpiry > Date.now()) {
        return existingExpiry;
    }

    const expiresAt = Date.now() + REMEMBERED_BROWSER_DURATION;
    localStorage.setItem(REMEMBERED_BROWSER_KEY, String(expiresAt));
    return expiresAt;
}

export function getRememberedBrowserExpiry() {
    const storedExpiry = localStorage.getItem(REMEMBERED_BROWSER_KEY);
    if (!storedExpiry) return 0;

    const expiresAt = Number(storedExpiry);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        clearRememberedBrowser();
        return 0;
    }

    return expiresAt;
}

export function hasRememberedBrowser() {
    return getRememberedBrowserExpiry() > 0;
}

/** Whole days left in the remember window (at least 1 while still active). */
export function getRememberedBrowserDaysRemaining() {
    const expiresAt = getRememberedBrowserExpiry();
    if (!expiresAt) return 0;

    const msLeft = expiresAt - Date.now();
    return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export function markRememberNoticePending() {
    if (!hasRememberedBrowser()) return;
    sessionStorage.setItem(REMEMBER_NOTICE_KEY, "1");
}

export function consumeRememberNoticePending() {
    const shouldShow = sessionStorage.getItem(REMEMBER_NOTICE_KEY) === "1";
    sessionStorage.removeItem(REMEMBER_NOTICE_KEY);
    return shouldShow;
}

export function clearRememberedBrowser() {
    localStorage.removeItem(REMEMBERED_BROWSER_KEY);
}

export function markExplicitLogout() {
    sessionStorage.setItem(EXPLICIT_LOGOUT_KEY, "1");
}

export function consumeExplicitLogout() {
    const wasExplicit = sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === "1";
    sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);
    return wasExplicit;
}

export function setTotpChallenge({ mode, email, password }) {
    sessionStorage.setItem(TOTP_MODE_KEY, mode);
    sessionStorage.setItem(TOTP_EMAIL_KEY, email || "");

    if (password) {
        sessionStorage.setItem(TOTP_PASSWORD_KEY, password);
    } else {
        sessionStorage.removeItem(TOTP_PASSWORD_KEY);
    }
}

export function getTotpChallenge() {
    return {
        mode: sessionStorage.getItem(TOTP_MODE_KEY) || "",
        email: sessionStorage.getItem(TOTP_EMAIL_KEY) || "",
        password: sessionStorage.getItem(TOTP_PASSWORD_KEY) || "",
    };
}

export function clearTotpChallenge() {
    sessionStorage.removeItem(TOTP_MODE_KEY);
    sessionStorage.removeItem(TOTP_EMAIL_KEY);
    sessionStorage.removeItem(TOTP_PASSWORD_KEY);
}
