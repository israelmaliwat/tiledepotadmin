import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut, multiFactor, TotpMultiFactorGenerator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { setTotpChallenge } from "./totp-session.js";

function hasTotpFactor(user) {
    return multiFactor(user).enrolledFactors.some(
        (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
        return;
    }

    if (!hasTotpFactor(user)) {
        setTotpChallenge({ mode: "enroll", email: user.email || "" });
        window.location.replace("otp.html");
    }
});

window.logout = async function logout() {
    try {
        await signOut(auth);
    } finally {
        window.location.href = "index.html";
    }
};
