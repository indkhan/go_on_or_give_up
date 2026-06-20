'use client'

// pending -> grey, processing -> yellow, completed -> green
const STYLES = {
    pending: { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563', label: 'Pending' },
    processing: { dot: '#eab308', bg: '#fef9c3', text: '#854d0e', label: 'Processing' },
    completed: { dot: '#22c55e', bg: '#dcfce7', text: '#166534', label: 'Completed' }
}

export default function StatusBadge({ status }) {
    const s = STYLES[status] || STYLES.pending
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: s.bg, color: s.text }}
        >
            <span
                className={`h-2 w-2 rounded-full ${status === 'processing' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: s.dot }}
            />
            {s.label}
        </span>
    )
}
