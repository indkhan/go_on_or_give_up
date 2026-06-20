// Hardcoded demo data for TradeFlow AI.
// The AI extraction (teammate's task) will eventually populate `invoices`.
// status: 'pending' (grey) | 'processing' (yellow) | 'completed' (green)

export const invoices = [
    {
        id: 'INV-2026-001',
        supplier: 'Global Steel Co',
        buyer: 'Swiss Import AG',
        amount: 25000,
        currency: 'USD',
        country: 'United States',
        date: '2026-05-12',
        status: 'completed'
    },
    {
        id: 'INV-2026-002',
        supplier: 'Lyon Textiles',
        buyer: 'Zurich Retail GmbH',
        amount: 18500,
        currency: 'EUR',
        country: 'France',
        date: '2026-05-28',
        status: 'completed'
    },
    {
        id: 'INV-2026-003',
        supplier: 'Manchester Parts Ltd',
        buyer: 'Helvetia Trading',
        amount: 12750,
        currency: 'GBP',
        country: 'United Kingdom',
        date: '2026-06-04',
        status: 'processing'
    },
    {
        id: 'INV-2026-004',
        supplier: 'Berlin Machinery',
        buyer: 'Alpine Goods AG',
        amount: 33200,
        currency: 'EUR',
        country: 'Germany',
        date: '2026-06-11',
        status: 'pending'
    },
    {
        id: 'INV-2026-005',
        supplier: 'Milan Fashion srl',
        buyer: 'Swiss Import AG',
        amount: 21000,
        currency: 'EUR',
        country: 'Italy',
        date: '2026-06-15',
        status: 'completed'
    }
]

// Historical settled volume (in USD-equivalent thousands) for the dashboard bars.
export const historical = {
    yearly: [
        { label: '2023', value: 420 },
        { label: '2024', value: 610 },
        { label: '2025', value: 845 },
        { label: '2026', value: 530 }
    ],
    monthly: [
        { label: 'Jan', value: 78 },
        { label: 'Feb', value: 64 },
        { label: 'Mar', value: 92 },
        { label: 'Apr', value: 110 },
        { label: 'May', value: 86 },
        { label: 'Jun', value: 100 }
    ],
    weekly: [
        { label: 'W1', value: 22 },
        { label: 'W2', value: 31 },
        { label: 'W3', value: 18 },
        { label: 'W4', value: 27 },
        { label: 'W5', value: 24 },
        { label: 'W6', value: 33 }
    ]
}

// Brand-aligned palette for the currency pie.
export const currencyColors = {
    USD: '#006097',
    EUR: '#0085c0',
    GBP: '#00aae4',
    CHF: '#7fd4f1',
    JPY: '#b9e6f7'
}

// Derived: amount by currency (for the pie chart).
export function amountByCurrency() {
    const totals = {}
    for (const inv of invoices) {
        totals[inv.currency] = (totals[inv.currency] || 0) + inv.amount
    }
    return Object.entries(totals).map(([currency, value]) => ({
        label: currency,
        value,
        color: currencyColors[currency] || '#006097'
    }))
}

// Derived: ranked totals by a given key ('supplier' | 'buyer').
export function topBy(key) {
    const totals = {}
    for (const inv of invoices) {
        totals[inv[key]] = (totals[inv[key]] || 0) + inv.amount
    }
    return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
}
