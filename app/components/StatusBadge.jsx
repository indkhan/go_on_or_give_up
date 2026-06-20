'use client'

const STATUS = {
    pending:    { pulse: false, label: 'Pending',    cls: 'pill--pending'    },
    processing: { pulse: true,  label: 'Processing', cls: 'pill--processing' },
    completed:  { pulse: false, label: 'Settled',    cls: 'pill--completed'  },
}

export default function StatusBadge({ status }) {
    const s = STATUS[status] || STATUS.pending
    return (
        <span className={`pill ${s.cls}`}>
            <span className={`pill-dot${s.pulse ? ' animate-pulse' : ''}`} />
            {s.label}
        </span>
    )
}
