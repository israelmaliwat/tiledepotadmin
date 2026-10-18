const headerDateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
});

function updateHeaderDate() {
    const currentDate = headerDateFormatter.format(new Date());
    document.querySelectorAll("[data-current-date]").forEach((dateElement) => {
        dateElement.textContent = currentDate;
    });
}

updateHeaderDate();
window.setInterval(updateHeaderDate, 60_000);
