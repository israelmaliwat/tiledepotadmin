export const TOTP_MODE_KEY = "tileDepotTotpMode";
export const TOTP_EMAIL_KEY = "tileDepotTotpEmail";
export const TOTP_PASSWORD_KEY = "tileDepotTotpPassword";

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
