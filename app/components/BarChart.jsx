'use client'

function fmt(v) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${Math.round(v / 1000)}k`
    return `$${v}`
}

// Clickable SVG bar chart. data: [{ label, value }]
// selectedLabel highlights one bar; onBarClick(label) toggles the filter.
export default function BarChart({ data, selectedLabel, onBarClick }) {
    const width = 520
    const height = 240
    const padding = { top: 24, right: 16, bottom: 32, left: 16 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const max = Math.max(...data.map(d => d.value), 1)
    const slot = chartW / Math.max(data.length, 1)
    const barW = Math.min(slot * 0.55, 64)

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7ee0ff" />
                    <stop offset="55%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#1f96cf" />
                </linearGradient>
            </defs>
            {data.map((d, i) => {
                const h = (d.value / max) * chartH
                const x = padding.left + i * slot + (slot - barW) / 2
                const y = padding.top + chartH - h
                const dim = selectedLabel && d.label !== selectedLabel
                return (
                    <g
                        key={d.label}
                        opacity={dim ? 0.3 : 1}
                        className="cursor-pointer"
                        onClick={() => onBarClick?.(d.label)}
                    >
                        {/* full-height hit area so thin/short bars are easy to click */}
                        <rect x={x} y={padding.top} width={barW} height={chartH} fill="transparent" />
                        <rect x={x} y={y} width={barW} height={h} rx="6" fill="url(#barGrad)" />
                        <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#e6edf4" fontWeight="600">
                            {fmt(d.value)}
                        </text>
                        <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="#7e8c9a">
                            {d.label}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}
