'use client'

import { useState } from 'react'
import StatusBadge from './components/StatusBadge'
import Dashboard from './components/Dashboard'
import { invoices as seedInvoices } from './data/mockData'

function InvoiceUpload({ onProcessed }) {
    const [file, setFile] = useState(null)
    const [busy, setBusy] = useState(false)

    function pick(e) {
        const f = e.target.files?.[0]
        if (f) setFile(f)
    }

    async function process() {
        if (!file) return
        setBusy(true)
        // Placeholder: AI extraction is a teammate's task.
        // For now we simulate the processing -> completed transition.
        setTimeout(() => {
            setBusy(false)
            onProcessed?.(file)
            setFile(null)
        }, 1500)
    }

    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-6">
                <h2 className="text-lg font-semibold">Upload Invoice</h2>
                <p className="text-sm text-base-content/60">
                    Drop an invoice and the AI extracts supplier, buyer, amount and currency automatically.
                </p>

                <label
                    htmlFor="invoice-file"
                    className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-base-300 bg-base-200/50 px-6 py-10 cursor-pointer hover:border-accent transition-colors"
                >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0085c0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    {file ? (
                        <span className="font-medium text-primary">{file.name}</span>
                    ) : (
                        <>
                            <span className="font-medium">Click to upload or drag & drop</span>
                            <span className="text-xs text-base-content/50">PNG, JPG or PDF</span>
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
                    className="btn btn-primary mt-4 w-full"
                    disabled={!file || busy}
                    onClick={process}
                >
                    {busy ? (
                        <span className="flex items-center gap-2">
                            <span className="loading loading-spinner loading-sm" /> Processing with AI…
                        </span>
                    ) : (
                        'Process Invoice'
                    )}
                </button>
            </div>
        </div>
    )
}

function InvoiceTable({ rows }) {
    return (
        <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body p-0">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr className="text-base-content/50">
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
                                <tr key={inv.id} className="hover:bg-base-200/40">
                                    <td className="font-mono text-xs">{inv.id}</td>
                                    <td className="font-medium">{inv.supplier}</td>
                                    <td>{inv.buyer}</td>
                                    <td className="text-right font-mono">
                                        {inv.amount.toLocaleString()} {inv.currency}
                                    </td>
                                    <td className="text-base-content/60">{inv.date}</td>
                                    <td><StatusBadge status={inv.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default function Home() {
    const [tab, setTab] = useState('invoices')
    const [rows, setRows] = useState(seedInvoices)

    function handleProcessed(file) {
        // New uploads land as "processing" until the AI step (teammate) fills in details.
        const next = {
            id: `INV-2026-${String(rows.length + 1).padStart(3, '0')}`,
            supplier: file.name.replace(/\.[^.]+$/, ''),
            buyer: '—',
            amount: 0,
            currency: '—',
            country: '—',
            date: new Date().toISOString().slice(0, 10),
            status: 'processing'
        }
        setRows([next, ...rows])
    }

    return (
        <div className="min-h-screen bg-base-200">
            {/* Header */}
            <header className="tf-gradient text-white">
                <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">TradeFlow AI</h1>
                        <p className="text-white/80 text-sm">AI-Assisted Trade Finance on XRPL</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm">
                        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        XRPL Testnet
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div role="tablist" className="tabs tabs-boxed bg-base-100 w-fit mb-6 shadow-sm">
                    <button
                        role="tab"
                        className={`tab ${tab === 'invoices' ? 'tab-active !bg-primary !text-white' : ''}`}
                        onClick={() => setTab('invoices')}
                    >
                        Invoices
                    </button>
                    <button
                        role="tab"
                        className={`tab ${tab === 'dashboard' ? 'tab-active !bg-primary !text-white' : ''}`}
                        onClick={() => setTab('dashboard')}
                    >
                        Dashboard
                    </button>
                </div>

                {tab === 'invoices' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
                        <InvoiceUpload onProcessed={handleProcessed} />
                        <InvoiceTable rows={rows} />
                    </div>
                ) : (
                    <Dashboard />
                )}
            </main>
        </div>
    )
}
