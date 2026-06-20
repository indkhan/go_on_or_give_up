'use client'

import { useMemo, useRef, useState } from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import landTopology from 'world-atlas/land-110m.json'
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

const MAP_WIDTH = 1200
const MAP_HEIGHT = 600
const land = feature(landTopology, landTopology.objects.land)
const projection = geoNaturalEarth1().fitExtent([[25, 35], [1175, 565]], land)
const landPath = geoPath(projection)(land)

const companies = {
    seller: [
        { name: 'Global Steel Co', city: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, volume: 2840000, deals: 38, sector: 'Industrial steel', match: 96 },
        { name: 'Lyon Textiles', city: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357, offset: [-12, 8], volume: 1680000, deals: 24, sector: 'Technical textiles', match: 92 },
        { name: 'Manchester Parts Ltd', city: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426, offset: [-13, -10], volume: 1240000, deals: 19, sector: 'Auto components', match: 89 },
        { name: 'Berlin Machinery', city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, offset: [14, -10], volume: 3210000, deals: 42, sector: 'Heavy machinery', match: 98 },
        { name: 'Milan Fashion srl', city: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19, offset: [13, 10], volume: 980000, deals: 17, sector: 'Apparel', match: 87 },
        { name: 'Shenzhen Components', city: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579, volume: 4460000, deals: 61, sector: 'Electronics', match: 94 },
        { name: 'Rotterdam Logistics', city: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777, offset: [0, -17], volume: 2090000, deals: 31, sector: 'Freight & logistics', match: 91 }
    ],
    buyer: [
        { name: 'Swiss Import AG', city: 'Zürich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, offset: [-18, -12], volume: 3750000, deals: 48, sector: 'Import & distribution', match: 97 },
        { name: 'Zurich Retail GmbH', city: 'Zürich', country: 'Switzerland', lat: 47.385, lng: 8.56, offset: [18, -10], volume: 2240000, deals: 33, sector: 'Retail', match: 93 },
        { name: 'Helvetia Trading', city: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432, offset: [-19, 13], volume: 1870000, deals: 28, sector: 'Commodities', match: 90 },
        { name: 'Alpine Goods AG', city: 'Bern', country: 'Switzerland', lat: 46.948, lng: 7.4474, offset: [0, 18], volume: 1430000, deals: 21, sector: 'Consumer goods', match: 88 },
        { name: 'Geneva Commodities', city: 'Geneva', country: 'Switzerland', lat: 46.19, lng: 6.12, offset: [20, 14], volume: 2920000, deals: 36, sector: 'Raw materials', match: 95 }
    ]
}

function fmt(v) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1000)}k`
    return `$${v}`
}

function CompanyMap({ role, onRoleChange }) {
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [hovered, setHovered] = useState(null)
    const drag = useRef(null)
    const targetType = role === 'buyer' ? 'seller' : 'buyer'
    const targetLabel = targetType === 'seller' ? 'sellers' : 'buyers'
    const visible = useMemo(
        () => companies[targetType].map(company => {
            const [x, y] = projection([company.lng, company.lat])
            return { ...company, x, y }
        }),
        [targetType]
    )

    const changeZoom = next => setZoom(Math.min(2.4, Math.max(0.85, next)))
    const resetMap = () => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }
    const mapTransform = `translate(${MAP_WIDTH / 2 + pan.x} ${MAP_HEIGHT / 2 + pan.y}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`

    return (
        <section className="market-map-shell">
            <svg
                className="vector-map"
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                role="application"
                aria-label={`Interactive world map showing ${targetLabel}`}
                onWheel={event => {
                    event.preventDefault()
                    changeZoom(zoom + (event.deltaY < 0 ? 0.12 : -0.12))
                }}
                onPointerDown={event => {
                    if (event.target.closest('.vector-marker')) return
                    event.currentTarget.setPointerCapture(event.pointerId)
                    drag.current = { x: event.clientX, y: event.clientY, pan }
                }}
                onPointerMove={event => {
                    if (!drag.current) return
                    setPan({
                        x: drag.current.pan.x + event.clientX - drag.current.x,
                        y: drag.current.pan.y + event.clientY - drag.current.y
                    })
                }}
                onPointerUp={() => { drag.current = null }}
                onPointerCancel={() => { drag.current = null }}
            >
                <defs>
                    <radialGradient id="ocean-light" cx="50%" cy="45%" r="70%">
                        <stop offset="0%" stopColor="#101a21" />
                        <stop offset="100%" stopColor="#060a0d" />
                    </radialGradient>
                    <filter id="pin-glow" x="-200%" y="-200%" width="400%" height="400%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#ocean-light)" />
                <g transform={mapTransform} className="vector-map-layer">
                    <path d={landPath} className="vector-land" />

                    {visible.map(company => (
                        <g
                            key={company.name}
                            className="vector-marker"
                            transform={`translate(${company.x + (company.offset?.[0] || 0)} ${company.y + (company.offset?.[1] || 0)})`}
                            onPointerEnter={() => setHovered(company.name)}
                            onPointerLeave={() => setHovered(null)}
                            onClick={event => {
                                event.stopPropagation()
                                setHovered(current => current === company.name ? null : company.name)
                            }}
                            onFocus={() => setHovered(company.name)}
                            onBlur={() => setHovered(null)}
                            tabIndex="0"
                            aria-label={`${company.name}, ${company.city}`}
                        >
                            <circle r="16" className="vector-pin-hit" />
                            <circle r="9" className="vector-pin-ring" />
                            <circle r="4" className="vector-pin-core" filter="url(#pin-glow)" />
                        </g>
                    ))}

                    {hovered && (() => {
                        const company = visible.find(item => item.name === hovered)
                        if (!company) return null
                        const alignLeft = company.x > 900
                        const cardX = alignLeft ? -278 : 20
                        return (
                            <g transform={`translate(${company.x + (company.offset?.[0] || 0)} ${company.y + (company.offset?.[1] || 0)})`} className="vector-card-layer">
                                <foreignObject x={cardX} y="-78" width="260" height="170">
                                    <div className="vector-company-card" xmlns="http://www.w3.org/1999/xhtml">
                                        <div className="vector-card-top">
                                            <strong>{company.name}</strong>
                                            <b>{company.match}% match</b>
                                        </div>
                                        <p>{company.city}, {company.country}</p>
                                        <div className="vector-card-stats">
                                            <span><small>Trade volume</small><strong>{fmt(company.volume)}</strong></span>
                                            <span><small>Completed deals</small><strong>{company.deals}</strong></span>
                                        </div>
                                        <small className="vector-card-sector">{company.sector}</small>
                                    </div>
                                </foreignObject>
                            </g>
                        )
                    })()}
                </g>
            </svg>

            <div className="role-switch market-role-switch" aria-label="Select your market role">
                {['buyer', 'seller'].map(option => (
                    <button
                        key={option}
                        className={role === option ? 'active' : ''}
                        onClick={() => onRoleChange(option)}
                        aria-pressed={role === option}
                    >
                        {option === 'buyer' ? 'Buyer' : 'Seller'}
                    </button>
                ))}
            </div>

            <div className="vector-map-controls" aria-label="Map controls">
                <button onClick={() => changeZoom(zoom + 0.18)} aria-label="Zoom in"><Plus size={17} /></button>
                <button onClick={() => changeZoom(zoom - 0.18)} aria-label="Zoom out"><Minus size={17} /></button>
                <button onClick={resetMap} aria-label="Reset map"><RotateCcw size={15} /></button>
            </div>
        </section>
    )
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
                                    <span className="font-medium"><span className="text-base-content/40 mr-2">{i + 1}</span>{item.name}</span>
                                    <span className="text-base-content/60 font-mono">{fmt(item.value)}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-base-200">
                                    <div className="h-1.5 rounded-full tf-gradient" style={{ width: `${(item.value / max) * 100}%` }} />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

const EMPTY = { period: null, currency: null, supplier: null, buyer: null }

export default function Dashboard() {
    const [role, setRole] = useState('buyer')
    const [range, setRange] = useState('monthly')
    const [filters, setFilters] = useState(EMPTY)
    const togglePeriod = label => setFilters(f => ({ ...f, period: f.period?.label === label && f.period?.rangeKey === range ? null : { rangeKey: range, label } }))
    const toggle = (dim, value) => setFilters(f => ({ ...f, [dim]: f[dim] === value ? null : value }))
    const barData = aggregateByPeriod(filterTxns(transactions, filters, 'period'), range)
    const pieData = aggregateByCurrency(filterTxns(transactions, filters, 'currency'))
    const supplierData = aggregateBy(filterTxns(transactions, filters, 'supplier'), 'supplier').slice(0, 5)
    const buyerData = aggregateBy(filterTxns(transactions, filters, 'buyer'), 'buyer').slice(0, 5)

    return (
        <div className="dashboard-experience">
            <CompanyMap role={role} onRoleChange={setRole} />

            <section id="analytics" className="analytics-section">
                <div className="analytics-heading">
                    <span className="eyebrow dark"><span /> Live intelligence</span>
                    <h2>Market analytics</h2>
                    <p>Explore settled volume and the strongest participants across your network.</p>
                </div>

                <div className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body p-5">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h3 className="font-semibold text-base-content/80">Settled Volume</h3>
                                <p className="text-xs text-base-content/50">Click a bar to filter · USD-equivalent</p>
                            </div>
                            <div className="join">
                                {RANGES.map(r => (
                                    <button key={r.key} className={`join-item btn btn-sm ${range === r.key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setRange(r.key); setFilters(f => ({ ...f, period: null })) }}>
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-3">
                            <BarChart data={barData} selectedLabel={filters.period?.rangeKey === range ? filters.period.label : null} onBarClick={togglePeriod} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card bg-base-100 shadow-sm border border-base-300">
                        <div className="card-body p-5">
                            <h3 className="font-semibold text-base-content/80">Volume by Currency</h3>
                            <p className="text-xs text-base-content/50 mb-3">Click a slice to filter</p>
                            <PieChart data={pieData} selectedLabel={filters.currency} onSliceClick={label => toggle('currency', label)} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-6">
                        <TopList title="Top Suppliers" items={supplierData} selectedName={filters.supplier} onSelect={name => toggle('supplier', name)} />
                        <TopList title="Top Buyers" items={buyerData} selectedName={filters.buyer} onSelect={name => toggle('buyer', name)} />
                    </div>
                </div>
            </section>
        </div>
    )
}
