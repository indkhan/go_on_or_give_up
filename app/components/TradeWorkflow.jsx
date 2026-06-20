'use client'

import { useState, useEffect } from 'react'

function Spinner() {
    return <span className="loading loading-spinner loading-xs" />
}

function WalletCard({ tone, label, wallet, loading, onGenerate }) {
    const accent = tone === 'buyer' ? 'text-sky-400' : 'text-teal-300'
    return (
        <div className="rounded-[0.8rem] border border-white/[0.07] bg-white/[0.015] p-4">
            <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{label}</span>
                {wallet && <span className="net-dot" />}
            </div>

            {wallet ? (
                <div className="mt-3">
                    <div className="tnum text-2xl font-semibold">
                        {wallet.balance ?? '—'} <span className="text-sm text-base-content/45">XRP</span>
                    </div>
                    <p className="addr mt-2">{wallet.address}</p>
                </div>
            ) : (
                <button
                    className="btn-ghost-line mt-3 w-full rounded-[0.6rem] py-2 text-sm font-medium"
                    onClick={onGenerate}
                    disabled={loading}
                >
                    {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Generating…</span> : 'Generate wallet'}
                </button>
            )}
        </div>
    )
}

export default function TradeWorkflow() {
    const [buyerWallet, setBuyerWallet] = useState(null)
    const [loadingBuyer, setLoadingBuyer] = useState(false)
    const [supplierWallet, setSupplierWallet] = useState(null)
    const [loadingSupplier, setLoadingSupplier] = useState(false)

    const [trade, setTrade] = useState(null)
    const [agentResult, setAgentResult] = useState(null)
    const [escrowResult, setEscrowResult] = useState(null)
    const [releaseResult, setReleaseResult] = useState(null)

    const [busyTrade, setBusyTrade] = useState(false)
    const [busyAgent, setBusyAgent] = useState(false)
    const [busyEscrow, setBusyEscrow] = useState(false)
    const [busyRelease, setBusyRelease] = useState(false)

    const [escrowUnlockTime, setEscrowUnlockTime] = useState(null)
    const [secondsRemaining, setSecondsRemaining] = useState(0)

    useEffect(() => {
        const buyer = localStorage.getItem('buyerWallet')
        if (buyer) setBuyerWallet(JSON.parse(buyer))

        const supplier = localStorage.getItem('supplierWallet')
        if (supplier) setSupplierWallet(JSON.parse(supplier))
    }, [])

    useEffect(() => {
        if (!escrowUnlockTime) return

        const timer = setInterval(() => {
            const remaining = Math.max(0, Math.floor((escrowUnlockTime - Date.now()) / 1000))
            setSecondsRemaining(remaining)
        }, 1000)

        return () => clearInterval(timer)
    }, [escrowUnlockTime])

    async function loadBalance(address) {
        const res = await fetch('/api/account-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        })
        return await res.json()
    }

    async function refreshBalances() {
        if (buyerWallet) {
            const buyerAccount = await loadBalance(buyerWallet.address)
            const updatedBuyer = { ...buyerWallet, balance: buyerAccount.balanceXrp }
            setBuyerWallet(updatedBuyer)
            localStorage.setItem('buyerWallet', JSON.stringify(updatedBuyer))
        }

        if (supplierWallet) {
            const supplierAccount = await loadBalance(supplierWallet.address)
            const updatedSupplier = { ...supplierWallet, balance: supplierAccount.balanceXrp }
            setSupplierWallet(updatedSupplier)
            localStorage.setItem('supplierWallet', JSON.stringify(updatedSupplier))
        }
    }

    async function generateBuyerWallet() {
        try {
            setLoadingBuyer(true)
            const walletRes = await fetch('/api/generate-wallet', { method: 'POST' })
            const wallet = await walletRes.json()
            const account = await loadBalance(wallet.address)
            const buyerData = { ...wallet, balance: account.balanceXrp }
            setBuyerWallet(buyerData)
            localStorage.setItem('buyerWallet', JSON.stringify(buyerData))
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingBuyer(false)
        }
    }

    async function generateSupplierWallet() {
        try {
            setLoadingSupplier(true)
            const walletRes = await fetch('/api/generate-wallet', { method: 'POST' })
            const wallet = await walletRes.json()
            const account = await loadBalance(wallet.address)
            const supplierData = { ...wallet, balance: account.balanceXrp }
            setSupplierWallet(supplierData)
            localStorage.setItem('supplierWallet', JSON.stringify(supplierData))
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingSupplier(false)
        }
    }

    async function createTrade() {
        try {
            setBusyTrade(true)
            const res = await fetch('/api/create-trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ supplier: 'ACME Export GmbH', buyer: 'Swiss Import AG', amount: 2 })
            })
            const data = await res.json()
            setTrade(data)
        } finally {
            setBusyTrade(false)
        }
    }

    async function runTreasuryAgent() {
        try {
            setBusyAgent(true)
            const res = await fetch('/api/treasury-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tradeId: trade.tradeId, amount: trade.amount, supplierApproved: true })
            })
            const data = await res.json()
            setAgentResult(data)
        } finally {
            setBusyAgent(false)
        }
    }

    async function reserveFunds() {
        try {
            setBusyEscrow(true)
            const res = await fetch('/api/create-escrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyerSeed: buyerWallet.seed,
                    supplierAddress: supplierWallet.address,
                    amount: trade.amount
                })
            })
            const data = await res.json()
            setEscrowResult(data)
            setEscrowUnlockTime((data.finishAfter + 946684800) * 1000)
            await refreshBalances()
        } finally {
            setBusyEscrow(false)
        }
    }

    async function confirmDelivery() {
        try {
            setBusyRelease(true)
            const res = await fetch('/api/release-escrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierSeed: supplierWallet.seed,
                    owner: escrowResult.owner,
                    offerSequence: escrowResult.offerSequence
                })
            })
            const data = await res.json()
            setReleaseResult(data)
            await refreshBalances()
        } finally {
            setBusyRelease(false)
        }
    }

    const walletsReady = !!buyerWallet && !!supplierWallet
    const d1 = !!trade
    const d2 = !!agentResult?.approved
    const d3 = !!escrowResult
    const d4 = !!releaseResult?.success
    const active = !d1 ? 1 : !d2 ? 2 : !d3 ? 3 : !d4 ? 4 : 5
    const stepClass = (n, done) => `step ${done ? 'is-done' : active === n ? 'is-active' : ''}`
    const Check = () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    )

    return (
        <div className="flex flex-col gap-6">
            <div>
                <span className="eyebrow-tag">Settlement</span>
                <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight">Trade settlement</h2>
                <p className="mt-1.5 max-w-xl text-sm text-base-content/55">
                    AI-cleared escrow on XRPL — funds reserved, then released on delivery.
                </p>
            </div>

            {/* Wallets */}
            <div className="panel panel-pad">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-base-content/55">Wallets</h3>
                    <span className="text-xs text-base-content/40">XRPL Testnet</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <WalletCard tone="buyer" label="Buyer" wallet={buyerWallet} loading={loadingBuyer} onGenerate={generateBuyerWallet} />
                    <WalletCard tone="supplier" label="Supplier" wallet={supplierWallet} loading={loadingSupplier} onGenerate={generateSupplierWallet} />
                </div>
            </div>

            {/* Flow */}
            <div className="panel panel-pad">
                <div className="step-rail">
                    {/* Step 1 — Create trade */}
                    <div className={stepClass(1, d1)}>
                        <div className="step__index">{d1 ? <Check /> : 1}</div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="step__title">Create trade</div>
                                    <div className="step__hint">ACME Export GmbH → Swiss Import AG · {trade?.amount || 2} XRP</div>
                                </div>
                                <button className="btn-ghost-line rounded-[0.6rem] px-4 py-2 text-sm font-medium" onClick={createTrade} disabled={busyTrade}>
                                    {busyTrade ? <span className="flex items-center gap-2"><Spinner /> Creating…</span> : d1 ? 'Re-create' : 'Create trade'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 — AI approval */}
                    <div className={stepClass(2, d2)}>
                        <div className="step__index">{d2 ? <Check /> : 2}</div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="step__title">AI treasury agent</div>
                                    <div className="step__hint">Policy & threshold checks</div>
                                </div>
                                <button className="btn-ghost-line rounded-[0.6rem] px-4 py-2 text-sm font-medium" onClick={runTreasuryAgent} disabled={!trade || busyAgent}>
                                    {busyAgent ? <span className="flex items-center gap-2"><Spinner /> Running…</span> : 'Run agent'}
                                </button>
                            </div>
                            {agentResult && (
                                <div className="note note-ok">
                                    <div className="font-medium">{agentResult.decision}</div>
                                    <div className="mt-1 flex gap-4 text-xs opacity-80">
                                        <span>Threshold {agentResult.policyChecks.thresholdCheck ? '✓' : '✕'}</span>
                                        <span>Supplier {agentResult.policyChecks.supplierApproved ? '✓' : '✕'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3 — Reserve funds */}
                    <div className={stepClass(3, d3)}>
                        <div className="step__index">{d3 ? <Check /> : 3}</div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="step__title">Reserve funds</div>
                                    <div className="step__hint">{walletsReady ? 'Lock buyer funds in escrow' : 'Generate both wallets first'}</div>
                                </div>
                                <button
                                    className="btn-ghost-line rounded-[0.6rem] px-4 py-2 text-sm font-medium"
                                    onClick={reserveFunds}
                                    disabled={!agentResult?.approved || !walletsReady || busyEscrow}
                                >
                                    {busyEscrow ? <span className="flex items-center gap-2"><Spinner /> Reserving…</span> : 'Reserve funds'}
                                </button>
                            </div>
                            {escrowResult && (
                                <div className="note note-info">
                                    Funds reserved · escrow{' '}
                                    <a href={`https://testnet.xrpl.org/transactions/${escrowResult.hash}`} target="_blank" rel="noopener noreferrer">
                                        {escrowResult.hash.slice(0, 10)}…
                                    </a>
                                </div>
                            )}
                            {escrowResult && secondsRemaining > 0 && (
                                <div className="note note-warn">Unlocks in {secondsRemaining}s</div>
                            )}
                        </div>
                    </div>

                    {/* Step 4 — Confirm delivery */}
                    <div className={stepClass(4, d4)}>
                        <div className="step__index">{d4 ? <Check /> : 4}</div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="step__title">Confirm delivery</div>
                                    <div className="step__hint">Release escrow to supplier</div>
                                </div>
                                <button
                                    className="btn-glow rounded-[0.6rem] px-4 py-2 text-sm font-semibold disabled:bg-none disabled:bg-white/[0.04] disabled:text-base-content/40"
                                    onClick={confirmDelivery}
                                    disabled={!escrowResult || secondsRemaining > 0 || busyRelease}
                                >
                                    {busyRelease ? <span className="flex items-center gap-2"><Spinner /> Settling…</span> : 'Confirm delivery'}
                                </button>
                            </div>
                            {releaseResult?.success && (
                                <div className="note note-ok">
                                    Supplier paid · settlement{' '}
                                    <a href={`https://testnet.xrpl.org/transactions/${releaseResult.hash}`} target="_blank" rel="noopener noreferrer">
                                        {releaseResult.hash.slice(0, 10)}…
                                    </a>
                                </div>
                            )}
                            {releaseResult && !releaseResult.success && (
                                <div className="note note-err">Release failed · {releaseResult.transactionResult}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
