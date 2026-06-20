// Shared transaction ledger powering the dashboard analytics.
// Power BI–style cross-filtering requires every visual to read from ONE dataset,
// so the bar chart, pie, and top lists all derive from `transactions`.
// Data is generated deterministically (seeded) so it never shuffles on reload.

const suppliers = [
    'Global Steel Co',
    'Lyon Textiles',
    'Manchester Parts Ltd',
    'Berlin Machinery',
    'Milan Fashion srl',
    'Shenzhen Components',
    'Rotterdam Logistics'
]

const buyers = [
    'Swiss Import AG',
    'Zurich Retail GmbH',
    'Helvetia Trading',
    'Alpine Goods AG',
    'Geneva Commodities'
]

const currencyMeta = [
    { currency: 'USD', country: 'United States', color: '#006097' },
    { currency: 'EUR', country: 'Germany', color: '#0085c0' },
    { currency: 'GBP', country: 'United Kingdom', color: '#00aae4' },
    { currency: 'CHF', country: 'Switzerland', color: '#7fd4f1' }
]

export const currencyColors = Object.fromEntries(
    currencyMeta.map(c => [c.currency, c.color])
)

// Deterministic PRNG (mulberry32) — stable output for a fixed seed.
function rng(seed) {
    return function () {
        seed |= 0
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export const transactions = (() => {
    const r = rng(42)
    const start = new Date('2023-01-01').getTime()
    const end = new Date('2026-06-18').getTime()
    const pick = arr => arr[Math.floor(r() * arr.length)]
    const out = []
    for (let i = 0; i < 44; i++) {
        const cm = pick(currencyMeta)
        out.push({
            id: `TX-${1000 + i}`,
            supplier: pick(suppliers),
            buyer: pick(buyers),
            amount: Math.round((8000 + r() * 42000) / 100) * 100,
            currency: cm.currency,
            country: cm.country,
            color: cm.color,
            date: new Date(start + r() * (end - start)).toISOString().slice(0, 10)
        })
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : 1))
})()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function weekOfYear(d) {
    const date = new Date(d)
    const oneJan = new Date(date.getFullYear(), 0, 1)
    return Math.ceil(((date - oneJan) / 86400000 + oneJan.getDay() + 1) / 7)
}

// The bucket a transaction falls into for a given range — used both to build
// bars AND to match a clicked bar back to its transactions (keeps them in sync).
export function bucketLabel(dateStr, rangeKey) {
    const d = new Date(dateStr)
    if (rangeKey === 'yearly') return String(d.getFullYear())
    if (rangeKey === 'monthly') return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    return `${String(d.getFullYear()).slice(2)}-W${String(weekOfYear(dateStr)).padStart(2, '0')}`
}

// Filter transactions by every active filter, optionally skipping one dimension
// (a visual never filters itself — that's the Power BI cross-highlight behaviour).
export function filterTxns(txns, filters, exclude) {
    return txns.filter(t => {
        if (exclude !== 'period' && filters.period) {
            if (bucketLabel(t.date, filters.period.rangeKey) !== filters.period.label) return false
        }
        if (exclude !== 'currency' && filters.currency && t.currency !== filters.currency) return false
        if (exclude !== 'supplier' && filters.supplier && t.supplier !== filters.supplier) return false
        if (exclude !== 'buyer' && filters.buyer && t.buyer !== filters.buyer) return false
        return true
    })
}

export function aggregateByPeriod(txns, rangeKey) {
    const map = new Map()
    for (const t of txns) {
        const label = bucketLabel(t.date, rangeKey)
        map.set(label, { label, value: (map.get(label)?.value || 0) + t.amount, sort: t.date })
    }
    const rows = [...map.values()].sort((a, b) => (a.sort < b.sort ? -1 : 1))
    // Yearly: show all. Monthly/weekly: most recent 6 buckets.
    return rangeKey === 'yearly' ? rows : rows.slice(-6)
}

export function aggregateByCurrency(txns) {
    const map = new Map()
    for (const t of txns) {
        map.set(t.currency, (map.get(t.currency) || 0) + t.amount)
    }
    return [...map.entries()]
        .map(([label, value]) => ({ label, value, color: currencyColors[label] }))
        .sort((a, b) => b.value - a.value)
}

export function aggregateBy(txns, key) {
    const map = new Map()
    for (const t of txns) {
        map.set(t[key], (map.get(t[key]) || 0) + t.amount)
    }
    return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
}
