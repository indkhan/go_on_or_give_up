'use client'

import { useState } from 'react'

export default function TradeWorkflow() {
    const [buyerWallet, setBuyerWallet] = useState(null)
    const [loadingBuyer, setLoadingBuyer] = useState(false)
    const [supplierWallet, setSupplierWallet] = useState(null)
    const [loadingSupplier, setLoadingSupplier] = useState(false)


    const [trade, setTrade] = useState(null)
    const [agentResult, setAgentResult] = useState(null)
    const [escrowResult, setEscrowResult] = useState(null)
    const [releaseResult, setReleaseResult] = useState(null)
    const [loading, setLoading] = useState(false)

    async function loadBalance(address) {
        const res = await fetch('/api/account-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                address
            })
        })

        return await res.json()
    }

    async function generateBuyerWallet() {
        try {
            setLoadingBuyer(true)

            const walletRes = await fetch('/api/generate-wallet', {
                method: 'POST'
            })

            const wallet = await walletRes.json()

            const account = await loadBalance(wallet.address)

            setBuyerWallet({
                ...wallet,
                balance: account.balanceXrp
            })
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingBuyer(false)
        }
    }

    async function generateSupplierWallet() {
        try {
            setLoadingSupplier(true)

            const walletRes = await fetch('/api/generate-wallet', {
                method: 'POST'
            })

            const wallet = await walletRes.json()

            const account = await loadBalance(wallet.address)

            setSupplierWallet({
                ...wallet,
                balance: account.balanceXrp
            })
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingSupplier(false)
        }
    }

    async function createTrade() {

        const res =
            await fetch('/api/create-trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supplier: 'ACME Export GmbH',
                    buyer: 'Swiss Import AG',
                    amount: 25000
                })
            })

        const data = await res.json()

        setTrade(data)
    }

    async function runTreasuryAgent() {

        const res =
            await fetch('/api/treasury-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tradeId: trade.tradeId,
                    amount: trade.amount,
                    supplierApproved: true
                })
            })

        const data = await res.json()

        setAgentResult(data)
    }

    async function reserveFunds() {

        const res =
            await fetch('/api/create-escrow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    buyerSeed: buyerWallet.seed,
                    supplierAddress: supplierWallet.address,
                    amount: trade.amount
                })
            })

        const data = await res.json()

        setEscrowResult(data)
    }

    async function confirmDelivery() {

        const res =
            await fetch('/api/release-escrow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    supplierSeed: supplierWallet.seed,
                    owner: escrowResult.owner,
                    offerSequence: escrowResult.offerSequence
                })
            })

        const data = await res.json()

        setReleaseResult(data)
    }

    return (
        <div className="flex flex-col gap-6">

            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body">

                    <h2 className="text-xl font-bold">
                        Trade Workflow
                    </h2>

                    <p className="text-sm text-base-content/60">
                        Demonstration of AI-assisted trade finance settlement on XRPL.
                    </p>

                </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body">

                    <h2 className="text-lg font-semibold mb-4">
                        Wallets
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">

                        <div className="border rounded-xl p-4">

                            <h3 className="font-semibold text-primary mb-3">
                                Buyer Wallet
                            </h3>

                            <button
                                className="btn btn-primary btn-sm"
                                onClick={generateBuyerWallet}
                                disabled={loadingBuyer}
                            >
                                {loadingBuyer
                                    ? 'Generating...'
                                    : 'Generate Buyer Wallet'}
                            </button>

                            {buyerWallet && (
                                <div className="mt-4 space-y-2 text-sm">

                                    <p>
                                        <strong>Address:</strong>
                                    </p>

                                    <p className="font-mono break-all">
                                        {buyerWallet.address}
                                    </p>

                                    <p>
                                        <strong>Balance:</strong>{' '}
                                        {buyerWallet.balance || '-'} XRP
                                    </p>

                                </div>
                            )}

                        </div>

                        <div className="border rounded-xl p-4">

                            <h3 className="font-semibold text-secondary mb-3">
                                Supplier Wallet
                            </h3>

                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={generateSupplierWallet}
                                disabled={loadingSupplier}
                            >
                                {loadingSupplier
                                    ? 'Generating...'
                                    : 'Generate Supplier Wallet'}
                            </button>

                            {supplierWallet && (
                                <div className="mt-4 space-y-2 text-sm">

                                    <p>
                                        <strong>Address:</strong>
                                    </p>

                                    <p className="font-mono break-all">
                                        {supplierWallet.address}
                                    </p>

                                    <p>
                                        <strong>Balance:</strong>{' '}
                                        {supplierWallet.balance || '-'} XRP
                                    </p>

                                </div>
                            )}

                        </div>

                    </div>

                </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body">

                    <h2 className="text-lg font-semibold">
                        Trade
                    </h2>

                    <div className="grid gap-2 mt-2">

                        <p>
                            <strong>Supplier:</strong> ACME Export GmbH
                        </p>

                        <p>
                            <strong>Buyer:</strong> Swiss Import AG
                        </p>

                        <p>
                            <strong>Amount:</strong> 25,000 XRP
                        </p>

                        <p>
                            <strong>Status:</strong>

                            <span className="badge badge-warning ml-2">
                                {trade?.status || 'Draft'}
                            </span>
                        </p>

                        <button
                            className="btn btn-primary mt-4"
                            onClick={createTrade}
                        >
                            Create Trade
                        </button>

                        <button
                            className="btn btn-warning mt-2"
                            disabled={!trade}
                            onClick={runTreasuryAgent}
                        >
                            Run Treasury Agent
                        </button>

                        {agentResult && (

                            <div className="alert alert-success mt-4">

                                <div>

                                    <p>
                                        ✅ {agentResult.decision}
                                    </p>

                                    <p>
                                        Threshold Check:
                                        {agentResult.policyChecks.thresholdCheck
                                            ? ' PASS'
                                            : ' FAIL'}
                                    </p>

                                    <p>
                                        Supplier Check:
                                        {agentResult.policyChecks.supplierApproved
                                            ? ' PASS'
                                            : ' FAIL'}
                                    </p>

                                </div>

                            </div>

                        )}

                        <button
                            className="btn btn-secondary mt-2"
                            disabled={!agentResult?.approved}
                            onClick={reserveFunds}
                        >
                            Reserve Funds
                        </button>

                        {escrowResult && (
                            <div className="alert alert-info mt-4">
                                <div>
                                    <p className="font-semibold">
                                        ✅ Funds Reserved
                                    </p>

                                    <p className="mt-2">
                                        XRPL Escrow Hash:
                                    </p>

                                    <p className="font-mono break-all text-sm">
                                        {escrowResult.hash}
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            className="btn btn-success mt-2"
                            disabled={!escrowResult}
                            onClick={confirmDelivery}
                        >
                            Confirm Delivery
                        </button>

                        {releaseResult && (
                            <div className="alert alert-success mt-4">
                                <div>

                                    <p className="font-semibold">
                                        ✅ Supplier Paid
                                    </p>

                                    <p className="mt-2">
                                        Settlement Hash:
                                    </p>

                                    <p className="font-mono break-all text-sm">
                                        {releaseResult.hash}
                                    </p>

                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </div >
    )
}
