const DASHBOARD_STATS_KEY = "tileDepotDashboardStats";

const DEFAULT_DASHBOARD_STATS = {
    deliveries: 6,
    products: 7,
};

function readDashboardStats() {
    try {
        const parsed = JSON.parse(localStorage.getItem(DASHBOARD_STATS_KEY) || "null");
        if (!parsed || typeof parsed !== "object") {
            return { ...DEFAULT_DASHBOARD_STATS };
        }

        return {
            deliveries: Number.isFinite(Number(parsed.deliveries))
                ? Number(parsed.deliveries)
                : DEFAULT_DASHBOARD_STATS.deliveries,
            products: Number.isFinite(Number(parsed.products))
                ? Number(parsed.products)
                : DEFAULT_DASHBOARD_STATS.products,
        };
    } catch {
        return { ...DEFAULT_DASHBOARD_STATS };
    }
}

function writeDashboardStats(partial) {
    const next = {
        ...readDashboardStats(),
        ...partial,
    };

    try {
        localStorage.setItem(DASHBOARD_STATS_KEY, JSON.stringify(next));
    } catch (error) {
        console.warn("Could not save dashboard stats:", error);
    }

    return next;
}

function countPendingDeliveries() {
    return document.querySelectorAll(
        "#supplierList .delivery-row, #customerList .delivery-row"
    ).length;
}

function countActiveProducts() {
    return document.querySelectorAll("#productList .product-row").length;
}

function syncDeliveriesCount() {
    return writeDashboardStats({ deliveries: countPendingDeliveries() });
}

function syncProductsCount() {
    return writeDashboardStats({ products: countActiveProducts() });
}

function getDashboardMonthlySalesTotal() {
    const rows = typeof window.SALES_DATA !== "undefined" ? window.SALES_DATA : [];
    if (typeof getCurrentMonthSalesTotal === "function") {
        return getCurrentMonthSalesTotal(rows);
    }
    return 0;
}

function applyDashboardSummaryCounts() {
    const stats = readDashboardStats();
    const cards = document.querySelectorAll(".summary-card");
    const monthlySales = getDashboardMonthlySalesTotal();

    cards.forEach((card) => {
        const label = card.querySelector(".summary-label")?.textContent.trim().toLowerCase();
        const numberEl = card.querySelector(".summary-number");
        if (!label || !numberEl) return;

        if (label === "deliveries") {
            numberEl.textContent = String(stats.deliveries);
        }

        if (label === "products") {
            numberEl.textContent = String(stats.products);
        }

        if (label === "monthly sales" || label === "sales") {
            numberEl.textContent = typeof formatSalesMoney === "function"
                ? formatSalesMoney(monthlySales)
                : Number(monthlySales).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
        }
    });
}

window.syncDeliveriesCount = syncDeliveriesCount;
window.syncProductsCount = syncProductsCount;
window.applyDashboardSummaryCounts = applyDashboardSummaryCounts;
window.readDashboardStats = readDashboardStats;
window.getDashboardMonthlySalesTotal = getDashboardMonthlySalesTotal;
