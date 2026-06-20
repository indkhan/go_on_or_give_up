'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import maplibregl from 'maplibre-gl'
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

const companies = {
    seller: [
        { name: 'Global Steel Co', city: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298, volume: 2840000, deals: 38, sector: 'Industrial steel', match: 96 },
        { name: 'Lyon Textiles', city: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357, volume: 1680000, deals: 24, sector: 'Technical textiles', match: 92 },
        { name: 'Manchester Parts Ltd', city: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426, volume: 1240000, deals: 19, sector: 'Auto components', match: 89 },
        { name: 'Berlin Machinery', city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, volume: 3210000, deals: 42, sector: 'Heavy machinery', match: 98 },
        { name: 'Milan Fashion srl', city: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19, volume: 980000, deals: 17, sector: 'Apparel', match: 87 },
        { name: 'Shenzhen Components', city: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579, volume: 4460000, deals: 61, sector: 'Electronics', match: 94 },
        { name: 'Rotterdam Logistics', city: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777, volume: 2090000, deals: 31, sector: 'Freight & logistics', match: 91 }
    ],
    buyer: [
        { name: 'Swiss Import AG', city: 'Zürich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, volume: 3750000, deals: 48, sector: 'Import & distribution', match: 97 },
        { name: 'Zurich Retail GmbH', city: 'Zürich', country: 'Switzerland', lat: 47.385, lng: 8.56, volume: 2240000, deals: 33, sector: 'Retail', match: 93 },
        { name: 'Helvetia Trading', city: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432, volume: 1870000, deals: 28, sector: 'Commodities', match: 90 },
        { name: 'Alpine Goods AG', city: 'Bern', country: 'Switzerland', lat: 46.948, lng: 7.4474, volume: 1430000, deals: 21, sector: 'Consumer goods', match: 88 },
        { name: 'Geneva Commodities', city: 'Geneva', country: 'Switzerland', lat: 46.19, lng: 6.12, volume: 2920000, deals: 36, sector: 'Raw materials', match: 95 }
    ]
}

function fmt(v) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1000)}k`
    return `$${v}`
}

function CompanyMap({ role, onRoleChange }) {
    const [query, setQuery] = useState('')
    const mapContainer = useRef(null)
    const map = useRef(null)
    const markers = useRef([])
    const targetType = role === 'buyer' ? 'seller' : 'buyer'
    const targetLabel = targetType === 'seller' ? 'sellers' : 'buyers'
    const visible = useMemo(
        () => companies[targetType].filter(company =>
            `${company.name} ${company.city} ${company.country} ${company.sector}`
                .toLowerCase()
                .includes(query.toLowerCase())
        ),
        [query, targetType]
    )

    useEffect(() => {
        if (map.current) return

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            center: [12, 30],
            zoom: 1.35,
            minZoom: 1,
            maxZoom: 12,
            attributionControl: false,
            style: {
                version: 8,
                sources: {
                    carto: {
                        type: 'raster',
                        tiles: [
                            'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
                            'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
                            'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png',
                            'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}@2x.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors © CARTO'
                    }
                },
                layers: [{ id: 'carto-dark', type: 'raster', source: 'carto' }]
            }
        })

        map.current.addControl(
            new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
            'bottom-right'
        )

        return () => {
            markers.current.forEach(marker => marker.remove())
            map.current?.remove()
            map.current = null
        }
    }, [])

    useEffect(() => {
        if (!map.current) return
        markers.current.forEach(marker => marker.remove())

        markers.current = visible.map(company => {
            const pin = document.createElement('button')
            pin.className = 'clean-map-pin'
            pin.type = 'button'
            pin.setAttribute('aria-label', `${company.name}, ${company.city}`)
            pin.innerHTML = '<span></span>'

            const card = document.createElement('div')
            card.className = 'clean-map-popup'

            const top = document.createElement('div')
            top.className = 'clean-map-popup-top'
            const name = document.createElement('strong')
            name.textContent = company.name
            const match = document.createElement('b')
            match.textContent = `${company.match}% match`
            top.append(name, match)

            const location = document.createElement('p')
            location.textContent = `${company.city}, ${company.country}`

            const stats = document.createElement('div')
            stats.className = 'clean-map-popup-stats'
            const volume = document.createElement('span')
            volume.innerHTML = `<small>Trade volume</small><strong>${fmt(company.volume)}</strong>`
            const deals = document.createElement('span')
            deals.innerHTML = `<small>Completed deals</small><strong>${company.deals}</strong>`
            stats.append(volume, deals)

            const sector = document.createElement('small')
            sector.className = 'clean-map-popup-sector'
            sector.textContent = company.sector
            card.append(top, location, stats, sector)

            const popup = new maplibregl.Popup({
                offset: 20,
                closeButton: false,
                closeOnClick: true,
                maxWidth: '280px'
            }).setDOMContent(card)

            return new maplibregl.Marker({ element: pin, anchor: 'center' })
                .setLngLat([company.lng, company.lat])
                .setPopup(popup)
                .addTo(map.current)
        })

        if (visible.length > 0) {
            const bounds = new maplibregl.LngLatBounds()
            visible.forEach(company => bounds.extend([company.lng, company.lat]))
            map.current.fitBounds(bounds, {
                padding: window.innerWidth < 700 ? 70 : 140,
                maxZoom: targetType === 'buyer' ? 6 : 3.1,
                duration: 700
            })
        }
    }, [visible, targetType])

    return (
        <section className="market-map-shell">
            <div ref={mapContainer} className="clean-map" aria-label={`Map showing available ${targetLabel}`} />

            <div className="market-map-toolbar">
                <div className="role-switch" aria-label="Select your market role">
                    {['buyer', 'seller'].map(option => (
                        <button
                            key={option}
                            className={role === option ? 'active' : ''}
                            onClick={() => onRoleChange(option)}
                            aria-pressed={role === option}
                        >
                            I&apos;m a {option}
                        </button>
                    ))}
                </div>

                <label className="market-search">
                    <Search size={16} />
                    <input
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        placeholder={`Search ${targetLabel}, sectors or countries`}
                    />
                </label>
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
