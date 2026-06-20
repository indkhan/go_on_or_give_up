'use client'

// Lightweight SVG bar chart. data: [{ label, value }]
export default function BarChart({ data }) {
    const width = 520
    const height = 240
    const padding = { top: 20, right: 16, bottom: 32, left: 16 }
    const chartW = width - padding.left - padding.right
    const chartH = height - padding.top - padding.bottom

    const max = Math.max(...data.map(d => d.value), 1)
    const slot = chartW / data.length
    const barW = slot * 0.55

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00aae4" />
                    <stop offset="100%" stopColor="#006097" />
                </linearGradient>
            </defs>
            {data.map((d, i) => {
                const h = (d.value / max) * chartH
                const x = padding.left + i * slot + (slot - barW) / 2
                const y = padding.top + chartH - h
                return (
                    <g key={d.label}>
                        <rect
                            x={x}
                            y={y}
                            width={barW}
                            height={h}
                            rx="6"
                            fill="url(#barGrad)"
                        />
                        <text
                            x={x + barW / 2}
                            y={y - 6}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#0f2a3c"
                            fontWeight="600"
                        >
                            {d.value}
                        </text>
                        <text
                            x={x + barW / 2}
                            y={height - 10}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#64748b"
                        >
                            {d.label}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}
