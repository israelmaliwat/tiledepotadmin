const toggle = document.querySelector(".menu-toggle");
const overlay = document.querySelector(".nav-overlay");

function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    if (toggle) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }
}

toggle?.addEventListener("click", () => {
    setNavOpen(!document.body.classList.contains("nav-open"));
});

overlay?.addEventListener("click", () => setNavOpen(false));

document.querySelectorAll(".sidebar-menu a").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
        setNavOpen(false);
    }
});
