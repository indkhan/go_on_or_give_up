'use client'

// Lightweight SVG donut chart. data: [{ label, value, color }]
export default function PieChart({ data }) {
    const size = 200
    const radius = 80
    const inner = 48
    const cx = size / 2
    const cy = size / 2
    const total = data.reduce((s, d) => s + d.value, 0) || 1

    let angle = -Math.PI / 2 // start at top

    function arc(startAngle, endAngle) {
        const x1 = cx + radius * Math.cos(startAngle)
        const y1 = cy + radius * Math.sin(startAngle)
        const x2 = cx + radius * Math.cos(endAngle)
        const y2 = cy + radius * Math.sin(endAngle)
        const ix2 = cx + inner * Math.cos(endAngle)
        const iy2 = cy + inner * Math.sin(endAngle)
        const ix1 = cx + inner * Math.cos(startAngle)
        const iy1 = cy + inner * Math.sin(startAngle)
        const large = endAngle - startAngle > Math.PI ? 1 : 0
        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`
    }

    return (
        <div className="flex items-center gap-6">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-44 h-44 shrink-0">
                {data.map(d => {
                    const slice = (d.value / total) * Math.PI * 2
                    const start = angle
                    const end = angle + slice
                    angle = end
                    return <path key={d.label} d={arc(start, end)} fill={d.color} />
                })}
            </svg>
            <div className="flex flex-col gap-2">
                {data.map(d => (
                    <div key={d.label} className="flex items-center gap-2 text-sm">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        <span className="font-medium">{d.label}</span>
                        <span className="text-base-content/50">
                            {Math.round((d.value / total) * 100)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
