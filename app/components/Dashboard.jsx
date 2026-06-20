'use client'

import { useState } from 'react'
import BarChart from './BarChart'
import PieChart from './PieChart'
import { historical, amountByCurrency, topBy } from '../data/mockData'

const RANGES = [
    { key: 'yearly', label: 'Yearly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'weekly', label: 'Weekly' }
]

function TopList({ title, items }) {
    const max = items[0]?.value || 1
    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-5">
                <h3 className="font-semibold text-base-content/80">{title}</h3>
                <div className="flex flex-col gap-3 mt-2">
                    {items.map((item, i) => (
                        <div key={item.name} className="flex flex-col gap-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">
                                    <span className="text-base-content/40 mr-2">{i + 1}</span>
                                    {item.name}
                                </span>
                                <span className="text-base-content/60 font-mono">
                                    {item.value.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-base-200">
                                <div
                                    className="h-1.5 rounded-full tf-gradient"
                                    style={{ width: `${(item.value / max) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function Dashboard() {
    const [range, setRange] = useState('monthly')

    return (
        <div className="flex flex-col gap-6">
            {/* Historical volume bars */}
            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-base-content/80">Settled Volume</h3>
                            <p className="text-xs text-base-content/50">USD-equivalent, in thousands</p>
                        </div>
                        <div className="join">
                            {RANGES.map(r => (
                                <button
                                    key={r.key}
                                    className={`join-item btn btn-sm ${range === r.key ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setRange(r.key)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3">
                        <BarChart data={historical[range]} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Currency / country pie */}
                <div className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body p-5">
                        <h3 className="font-semibold text-base-content/80">Volume by Currency</h3>
                        <div className="mt-3">
                            <PieChart data={amountByCurrency()} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <TopList title="Top Suppliers" items={topBy('supplier').slice(0, 5)} />
                    <TopList title="Top Buyers" items={topBy('buyer').slice(0, 5)} />
                </div>
            </div>
        </div>
    )
}
