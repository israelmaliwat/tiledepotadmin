function toSalesDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function salesDateInMonth(dateString, year, monthIndex) {
    const date = new Date(String(dateString) + "T00:00:00");
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function getCurrentMonthBounds(referenceDate = new Date()) {
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);
    return {
        year: ref.getFullYear(),
        monthIndex: ref.getMonth(),
    };
}

/** Sample daily sales. Most are in the current calendar month; a few stay in the prior month so month totals exclude them. */
function buildSalesData(referenceDate = new Date()) {
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);

    const currentYear = ref.getFullYear();
    const currentMonth = ref.getMonth();
    const day = Math.min(ref.getDate(), 28);

    const inCurrentMonth = (dom) => {
        const date = new Date(currentYear, currentMonth, Math.min(dom, day));
        return toSalesDateValue(date);
    };

    const prior = new Date(currentYear, currentMonth, 1);
    prior.setDate(0);
    const priorMonthDate = (dom) => {
        const lastDay = prior.getDate();
        const date = new Date(prior.getFullYear(), prior.getMonth(), Math.min(dom, lastDay));
        return toSalesDateValue(date);
    };

    return [
        { timestamp: "8:20 AM", number: 1, product: "BRICK-X", category: "TERRACOTTA", quantity: 30, total: 1200, date: inCurrentMonth(day) },
        { timestamp: "8:41 AM", number: 2, product: "LUXURY WHITE", category: "PORCELAIN", quantity: 5, total: 250, date: inCurrentMonth(Math.max(1, day - 2)) },
        { timestamp: "10:39 AM", number: 3, product: "LUXURY WHITE", category: "PORCELAIN", quantity: 10, total: 500, date: inCurrentMonth(Math.max(1, day - 4)) },
        { timestamp: "12:45 PM", number: 4, product: "WOODEN-NARA", category: "CERAMIC", quantity: 25, total: 750, date: inCurrentMonth(Math.max(1, day - 6)) },
        { timestamp: "1:03 PM", number: 5, product: "WOODEN-BROWN", category: "CERAMIC", quantity: 48, total: 1440, date: inCurrentMonth(Math.max(1, day - 8)) },
        { timestamp: "1:40 PM", number: 6, product: "BEIGE-MARBLE", category: "PORCELAIN", quantity: 30, total: 1500, date: priorMonthDate(12) },
        { timestamp: "2:09 PM", number: 7, product: "WOODEN-LIGHT", category: "CERAMIC", quantity: 40, total: 1200, date: inCurrentMonth(Math.max(1, day - 10)) },
        { timestamp: "3:30 PM", number: 8, product: "LUXURY BLACK", category: "PORCELAIN", quantity: 25, total: 1250, date: priorMonthDate(8) },
        { timestamp: "9:15 AM", number: 9, product: "SANDSTONE", category: "CEMENT", quantity: 18, total: 900, date: inCurrentMonth(Math.max(1, day - 5)) },
        { timestamp: "11:05 AM", number: 10, product: "MARBLE-ASH", category: "PORCELAIN", quantity: 12, total: 640, date: inCurrentMonth(Math.max(1, day - 7)) },
        { timestamp: "4:25 PM", number: 11, product: "LUXURY BLACK", category: "PORCELAIN", quantity: 20, total: 1000, date: inCurrentMonth(day) },
        { timestamp: "7:10 AM", number: 12, product: "WOODEN-DARK", category: "CERAMIC", quantity: 22, total: 660, date: inCurrentMonth(Math.max(1, day - 1)) },
        { timestamp: "10:20 AM", number: 13, product: "CHARCOAL", category: "PAVING BLOCKS", quantity: 14, total: 840, date: inCurrentMonth(Math.max(1, day - 3)) },
        { timestamp: "12:10 PM", number: 14, product: "BROWN-EDGE", category: "VITRIFIED", quantity: 16, total: 1120, date: inCurrentMonth(Math.max(1, day - 9)) },
    ];
}

function getSalesForCalendarMonth(salesRows, referenceDate = new Date()) {
    const { year, monthIndex } = getCurrentMonthBounds(referenceDate);
    return (salesRows || []).filter((row) => salesDateInMonth(row.date, year, monthIndex));
}

function sumSalesTotals(salesRows) {
    return (salesRows || []).reduce((sum, row) => sum + (Number(row.total) || 0), 0);
}

function formatSalesMoney(amount) {
    return Number(amount || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function getCurrentMonthSalesTotal(salesRows, referenceDate = new Date()) {
    return sumSalesTotals(getSalesForCalendarMonth(salesRows, referenceDate));
}

const SALES_DATA = buildSalesData();

window.toSalesDateValue = toSalesDateValue;
window.salesDateInMonth = salesDateInMonth;
window.getCurrentMonthBounds = getCurrentMonthBounds;
window.buildSalesData = buildSalesData;
window.getSalesForCalendarMonth = getSalesForCalendarMonth;
window.sumSalesTotals = sumSalesTotals;
window.formatSalesMoney = formatSalesMoney;
window.getCurrentMonthSalesTotal = getCurrentMonthSalesTotal;
window.SALES_DATA = SALES_DATA;
