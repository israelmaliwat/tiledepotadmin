import { multiFactor, TotpMultiFactorGenerator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getRememberedBrowserExpiry } from "./totp-session.js";

function hasTotpFactor(user) {
    return multiFactor(user).enrolledFactors.some(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

/**
 * Trusted browser within the 30-day window + an active Firebase session
 * that already completed authenticator enrollment. Does not depend on
 * token claim sign_in_second_factor (missing after enroll / some refreshes).
 */
export async function isRememberedTotpSession(user) {
    if (!user) return false;

    const expiresAt = getRememberedBrowserExpiry();
    if (!expiresAt) return false;

    return hasTotpFactor(user);
}
