'use client'

import { useState } from 'react'
import StatusBadge from './components/StatusBadge'
import Dashboard from './components/Dashboard'
import { invoices as seedInvoices } from './data/mockData'
import TradeWorkflow from './components/TradeWorkflow'
import { useRole } from './context/RoleContext'

function RoleOnboarding({ onSelect }) {
    return (
        <div className="app-shell flex min-h-screen items-center justify-center px-6">
            <div className="panel panel-pad max-w-sm text-center">
                <h2 className="font-display text-lg font-semibold">Welcome to TradeFlow AI</h2>
                <p className="mt-1 text-sm text-base-content/55">Tell us how you'll use the platform.</p>
                <div className="mt-6 flex flex-col gap-3">
                    <button className="btn-glow rounded-[0.7rem] py-3 text-sm font-semibold" onClick={() => onSelect('buyer')}>
                        I'm a Buyer
                    </button>
                    <button className="btn-glow rounded-[0.7rem] py-3 text-sm font-semibold" onClick={() => onSelect('seller')}>
                        I'm a Seller
                    </button>
                </div>
            </div>
        </div>
    )
}

function UploadIcon() {
    return (
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    )
}

function InvoiceUpload({ onProcessed }) {
    const [file, setFile] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    function pick(e) {
        const f = e.target.files?.[0]
        if (f) {
            setFile(f)
            setError(null)
        }
    }

    async function process() {
        if (!file) return
        setBusy(true)
        setError(null)
        try {
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/extract-invoice', { method: 'POST', body: form })
            const json = await res.json()
            if (!res.ok || !json.ok) {
                throw new Error(json.error || 'Extraction failed.')
            }
            onProcessed?.(json.data, json.meta)
            setFile(null)
        } catch (err) {
            setError(err.message || 'Could not process the invoice.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="panel panel-pad self-start">
            <span className="eyebrow-tag">Upload</span>
            <h2 className="font-display mt-3 text-lg font-semibold">New invoice</h2>
            <p className="mt-1 text-sm text-base-content/55">AI reads supplier, buyer & amount.</p>

            <label htmlFor="invoice-file" className="dropzone mt-5">
                <span className="text-sky-300/90">
                    <UploadIcon />
                </span>
                {file ? (
                    <span className="font-medium text-sky-300">{file.name}</span>
                ) : (
                    <>
                        <span className="text-sm font-medium">Drop a file or browse</span>
                        <span className="text-xs tracking-wider text-base-content/40 uppercase">PNG · JPG · PDF</span>
                    </>
                )}
                <input
                    id="invoice-file"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    className="hidden"
                    onChange={pick}
                />
            </label>

            <button
                className="btn-glow mt-4 w-full rounded-[0.7rem] py-3 text-sm font-semibold disabled:bg-none disabled:bg-white/[0.04] disabled:text-base-content/40"
                disabled={!file || busy}
                onClick={process}
            >
                {busy ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="loading loading-spinner loading-sm" /> Reading…
                    </span>
                ) : (
                    'Process invoice'
                )}
            </button>

            {error && <p className="note note-err mt-3">{error}</p>}
        </div>
    )
}

function InvoiceTable({ rows }) {
    return (
        <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
                <table className="tf-table">
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Supplier</th>
                            <th>Buyer</th>
                            <th className="text-right">Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(inv => (
                            <tr key={inv.id}>
                                <td className="tnum text-xs text-base-content/55">{inv.id}</td>
                                <td className="font-medium">{inv.supplier}</td>
                                <td className="text-base-content/75">{inv.buyer}</td>
                                <td className="tnum text-right">
                                    {inv.amount.toLocaleString()} <span className="text-base-content/45">{inv.currency}</span>
                                </td>
                                <td className="tnum text-xs text-base-content/45">{inv.date}</td>
                                <td><StatusBadge status={inv.status} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const TABS = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'workflow', label: 'Settlement' },
]

export default function Home() {
    const { role, setRole, loaded } = useRole()
    const [tab, setTab] = useState('invoices')
    const [rows, setRows] = useState(seedInvoices)

    if (!loaded) return null
    if (!role) return <RoleOnboarding onSelect={setRole} />

    function handleProcessed(data, meta) {
        const next = {
            id: `INV-2026-${String(rows.length + 1).padStart(3, '0')}`,
            supplier: data?.supplier || '—',
            buyer: data?.buyer || '—',
            amount: typeof data?.amount === 'number' ? data.amount : 0,
            currency: data?.currency || '—',
            country: '—',
            date: new Date().toISOString().slice(0, 10),
            status: meta?.needsReview ? 'pending' : 'completed'
        }
        setRows([next, ...rows])
    }

    return (
        <div className="app-shell">
            {/* Top bar */}
            <header className="app-bar">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="brand-mark">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 17 L10 11 L14 15 L20 7" />
                                <path d="M15 7 L20 7 L20 12" />
                            </svg>
                        </span>
                        <div className="leading-none">
                            <span className="wordmark text-[17px] text-base-content">TradeFlow</span>
                            <span className="wordmark text-[17px] text-sky-400"> AI</span>
                        </div>
                    </div>
                    <div className="net-pill">
                        <span className="net-dot" />
                        XRPL Testnet
                    </div>
                </div>
            </header>

            <main className={tab === 'dashboard' ? 'dashboard-main' : 'mx-auto max-w-6xl px-6 py-9'}>
                {/* Tabs */}
                <div
                    role="tablist"
                    className={`seg ${tab === 'dashboard' ? 'dashboard-tabs' : 'mb-8'}`}
                >
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            role="tab"
                            className={`seg__btn ${tab === t.key ? 'is-active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'invoices' ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[330px_1fr]">
                        <InvoiceUpload onProcessed={handleProcessed} />
                        <InvoiceTable rows={rows} />
                    </div>
                ) : tab === 'dashboard' ? (
                    <Dashboard />
                ) : (
                    <TradeWorkflow />
                )}
            </main>
        </div>
    )
}
