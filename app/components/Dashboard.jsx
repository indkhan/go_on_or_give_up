'use client'

import { useState } from 'react'
import BarChart from './BarChart'
import PieChart from './PieChart'
import {
    transactions,
    filterTxns,
    aggregateByPeriod,
    aggregateByCurrency,
    aggregateBy
} from '../data/dashboardData'

const RANGES = [
    { key: 'yearly', label: 'Yearly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'weekly', label: 'Weekly' }
]

function fmt(v) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1000)}k`
    return `$${v}`
}

function TopList({ title, items, selectedName, onSelect }) {
    const max = items[0]?.value || 1
    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-5">
                <h3 className="font-semibold text-base-content/80">{title}</h3>
                <div className="flex flex-col gap-2 mt-2">
                    {items.map((item, i) => {
                        const active = selectedName === item.name
                        const dim = selectedName && !active
                        return (
                            <button
                                key={item.name}
                                onClick={() => onSelect(item.name)}
                                className={`flex flex-col gap-1 rounded-lg px-2 py-1.5 -mx-2 text-left transition-all ${active ? 'bg-base-200 ring-1 ring-primary/40' : 'hover:bg-base-200/60'} ${dim ? 'opacity-40' : ''}`}
                            >
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">
                                        <span className="text-base-content/40 mr-2">{i + 1}</span>
                                        {item.name}
                                    </span>
                                    <span className="text-base-content/60 font-mono">{fmt(item.value)}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-base-200">
                                    <div className="h-1.5 rounded-full tf-gradient" style={{ width: `${(item.value / max) * 100}%` }} />
                                </div>
                            </button>
                        )
                    })}
                    {items.length === 0 && (
                        <p className="text-sm text-base-content/40 py-2">No data for current filter.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

const EMPTY = { period: null, currency: null, supplier: null, buyer: null }

export default function Dashboard() {
    const [range, setRange] = useState('monthly')
    const [filters, setFilters] = useState(EMPTY)

    // Toggle helpers — clicking the active value again clears it.
    const togglePeriod = label =>
        setFilters(f => ({
            ...f,
            period: f.period?.label === label && f.period?.rangeKey === range ? null : { rangeKey: range, label }
        }))
    const toggle = (dim, value) =>
        setFilters(f => ({ ...f, [dim]: f[dim] === value ? null : value }))

    function changeRange(key) {
        setRange(key)
        // A period selection only makes sense within its own range.
        setFilters(f => ({ ...f, period: null }))
    }

    // Each visual is filtered by every dimension EXCEPT its own (cross-highlight).
    const barData = aggregateByPeriod(filterTxns(transactions, filters, 'period'), range)
    const pieData = aggregateByCurrency(filterTxns(transactions, filters, 'currency'))
    const supplierData = aggregateBy(filterTxns(transactions, filters, 'supplier'), 'supplier').slice(0, 5)
    const buyerData = aggregateBy(filterTxns(transactions, filters, 'buyer'), 'buyer').slice(0, 5)

    const activeChips = [
        filters.period && { dim: 'period', text: `Period: ${filters.period.label}` },
        filters.currency && { dim: 'currency', text: `Currency: ${filters.currency}` },
        filters.supplier && { dim: 'supplier', text: `Supplier: ${filters.supplier}` },
        filters.buyer && { dim: 'buyer', text: `Buyer: ${filters.buyer}` }
    ].filter(Boolean)

    const clearChip = dim => setFilters(f => ({ ...f, [dim]: null }))

    return (
        <div className="flex flex-col gap-6">
            {/* Active filter chips */}
            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-base-content/50">Filters:</span>
                    {activeChips.map(chip => (
                        <button
                            key={chip.dim}
                            onClick={() => clearChip(chip.dim)}
                            className="badge badge-primary gap-1 cursor-pointer"
                        >
                            {chip.text}
                            <span className="font-bold">✕</span>
                        </button>
                    ))}
                    <button onClick={() => setFilters(EMPTY)} className="text-xs text-base-content/50 underline ml-1">
                        Clear all
                    </button>
                </div>
            )}

            {/* Historical volume bars */}
            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base-content/80">Settled Volume</h3>
                            <p className="text-xs text-base-content/50">Click a bar to filter — USD-equivalent</p>
                        </div>
                        <div className="join">
                            {RANGES.map(r => (
                                <button
                                    key={r.key}
                                    className={`join-item btn btn-sm ${range === r.key ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => changeRange(r.key)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3">
                        <BarChart
                            data={barData}
                            selectedLabel={filters.period?.rangeKey === range ? filters.period.label : null}
                            onBarClick={togglePeriod}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Currency pie */}
                <div className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body p-5">
                        <h3 className="font-semibold text-base-content/80">Volume by Currency</h3>
                        <p className="text-xs text-base-content/50 mb-3">Click a slice to filter</p>
                        <PieChart
                            data={pieData}
                            selectedLabel={filters.currency}
                            onSliceClick={label => toggle('currency', label)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <TopList
                        title="Top Suppliers"
                        items={supplierData}
                        selectedName={filters.supplier}
                        onSelect={name => toggle('supplier', name)}
                    />
                    <TopList
                        title="Top Buyers"
                        items={buyerData}
                        selectedName={filters.buyer}
                        onSelect={name => toggle('buyer', name)}
                    />
                </div>
            </div>
        </div>
    )
}
