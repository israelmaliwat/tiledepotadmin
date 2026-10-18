import { auth } from "./firebase-config.js";
import { formatProfileName } from "./profile-name.js";

const EVENT_LOG_STORAGE_KEY = "tileDepotEventLogs";
const EVENT_LOG_RESET_KEY = "tileDepotEventLogsReset";
const EVENT_LOG_RESET_TOKEN = "2026-10-15-reset";
const EVENT_LOG_LIMIT = 200;
const LEGACY_ACTIVITY_KEYS = [
    "tileDepotProductActivity",
    "tileDepotDeliveryActivity",
];

function resetEventLogsIfNeeded() {
    try {
        if (localStorage.getItem(EVENT_LOG_RESET_KEY) === EVENT_LOG_RESET_TOKEN) {
            return;
        }

        localStorage.removeItem(EVENT_LOG_STORAGE_KEY);
        LEGACY_ACTIVITY_KEYS.forEach((key) => localStorage.removeItem(key));
        localStorage.setItem(EVENT_LOG_RESET_KEY, EVENT_LOG_RESET_TOKEN);
    } catch (error) {
        console.warn("Could not reset event logs:", error);
    }
}

resetEventLogsIfNeeded();

export function getActivityActor() {
    const user = auth.currentUser;
    const formatted = formatProfileName(user?.displayName);
    if (formatted) return formatted;

    const fromDom = document.querySelector(".profile-name")?.textContent?.trim();
    if (fromDom && fromDom.toUpperCase() !== "ACCOUNT") {
        return fromDom.toUpperCase();
    }

    return (user?.email || "Unknown User").toUpperCase();
}

export function loadEventLogs() {
    try {
        const entries = JSON.parse(localStorage.getItem(EVENT_LOG_STORAGE_KEY) || "[]");
        return Array.isArray(entries) ? entries.slice(0, EVENT_LOG_LIMIT) : [];
    } catch {
        return [];
    }
}

export function appendEventLog({ source, action, details, actor, timestamp }) {
    const entry = {
        source: source || "System",
        action: action || "Updated",
        details: details || "",
        actor: actor || getActivityActor(),
        timestamp: timestamp || new Date().toISOString(),
    };

    const entries = loadEventLogs();
    entries.unshift(entry);
    const limited = entries.slice(0, EVENT_LOG_LIMIT);

    try {
        localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
        console.warn("Could not save event log:", error);
    }

    return entry;
}

window.getActivityActor = getActivityActor;
window.appendEventLog = appendEventLog;
window.loadEventLogs = loadEventLogs;
