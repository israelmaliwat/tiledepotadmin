const eyeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        <path class="eye-slash" d="M3 3l18 18"></path>
    </svg>
`;

document.querySelectorAll('input[type="password"]').forEach((input) => {
    const container = input.closest(".password-field") || input.parentElement;
    if (!container) return;

    container.classList.add("has-password-toggle");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");
    toggle.innerHTML = eyeIcon;
    container.append(toggle);

    toggle.addEventListener("click", () => {
        const showPassword = input.type === "password";
        input.type = showPassword ? "text" : "password";
        toggle.classList.toggle("is-visible", showPassword);
        toggle.setAttribute("aria-label", showPassword ? "Hide password" : "Show password");
        toggle.setAttribute("aria-pressed", String(showPassword));
    });
});
