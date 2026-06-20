'use client'

// pending -> slate, processing -> amber, completed -> teal/green
const STYLES = {
    pending: { dot: '#94a3b8', fg: '#cbd5e1', bg: 'rgba(148,163,184,0.10)', bd: 'rgba(148,163,184,0.22)', label: 'Pending' },
    processing: { dot: '#fbbf24', fg: '#fcd887', bg: 'rgba(251,191,36,0.10)', bd: 'rgba(251,191,36,0.26)', label: 'Processing' },
    completed: { dot: '#34d399', fg: '#8ff0cf', bg: 'rgba(52,211,153,0.10)', bd: 'rgba(52,211,153,0.26)', label: 'Settled' }
}

export default function StatusBadge({ status }) {
    const s = STYLES[status] || STYLES.pending
    return (
        <span className="pill" style={{ backgroundColor: s.bg, borderColor: s.bd, color: s.fg }}>
            <span
                className={`pill-dot ${status === 'processing' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: s.dot }}
            />
            {s.label}
        </span>
    )
}
