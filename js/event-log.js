import { auth } from "./firebase-config.js";
import { formatProfileName } from "./profile-name.js";

const EVENT_LOG_STORAGE_KEY = "tileDepotEventLogs";
const EVENT_LOG_RESET_KEY = "tileDepotEventLogsReset";
const EVENT_LOG_RESET_TOKEN = "2026-10-15-reset";
const EVENT_LOG_RETENTION_DAYS = 90;
const LEGACY_ACTIVITY_KEYS = [
    "tileDepotProductActivity",
    "tileDepotDeliveryActivity",
];

function eventLogCutoff(now = new Date()) {
    const cutoff = new Date(now);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - EVENT_LOG_RETENTION_DAYS);
    return cutoff.getTime();
}

function isWithinRetention(entry, cutoff = eventLogCutoff()) {
    const time = Date.parse(entry?.timestamp || "");
    if (Number.isNaN(time)) return true;
    return time >= cutoff;
}

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
        if (!Array.isArray(entries)) return [];

        const cutoff = eventLogCutoff();
        const recent = entries.filter((entry) => isWithinRetention(entry, cutoff));
        if (recent.length !== entries.length) {
            localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(recent));
        }
        return recent;
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

    try {
        localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.warn("Could not save event log:", error);
    }

    return entry;
}

window.getActivityActor = getActivityActor;
window.appendEventLog = appendEventLog;
window.loadEventLogs = loadEventLogs;
