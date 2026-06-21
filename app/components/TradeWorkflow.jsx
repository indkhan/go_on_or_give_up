'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import * as xrpl from 'xrpl'
import { useWallet } from '../context/WalletContext'
import { ASSET_LIST, DEFAULT_ASSET } from '../config/assets'

function SupplierBalance({ address }) {
    const [balance, setBalance] = useState(null)
    const [funding, setFunding] = useState(false)

    async function fetchBalance() {
        const d = await fetch('/api/account-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address })
        }).then(r => r.json())
        setBalance(d.balanceXrp ?? null)
    }

    useEffect(() => { fetchBalance() }, [address])

    async function fundFromFaucet() {
        setFunding(true)
        try {
            await fetch('https://faucet.altnet.rippletest.net/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination: address })
            })
            await new Promise(r => setTimeout(r, 4000))
            await fetchBalance()
        } finally {
            setFunding(false)
        }
    }

    return (
        <div className="space-y-1">
            <p><strong>Balance:</strong> {balance !== null ? `${balance} XRP` : '—'}</p>
            {(balance === null || Number(balance) < 1) && (
                <button
                    className="btn btn-xs btn-warning mt-1"
                    onClick={fundFromFaucet}
                    disabled={funding}
                >
                    {funding ? 'Funding...' : '💧 Fund Testnet Wallet'}
                </button>
            )}
        </div>
    )
}

export default function TradeWorkflow() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const urlRole = searchParams.get('role')
    const urlTradeId = searchParams.get('tradeId')

    const [role, setRole] = useState(urlRole ?? null)
    const [tradeId, setTradeId] = useState(urlTradeId ?? null)
    const [supplierLink, setSupplierLink] = useState(null)

    const [supplierWallet, setSupplierWallet] = useState(null)

    const [trade, setTrade] = useState(null)
    const [agentResult, setAgentResult] = useState(null)
    const [escrowResult, setEscrowResult] = useState(null)
    const [checkResult, setCheckResult] = useState(null)
    const [releaseResult, setReleaseResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [trustlineStatus, setTrustlineStatus] = useState({ buyer: false, supplier: false })
    const [trustlineError, setTrustlineError] = useState(null)

    const [escrowUnlockTime, setEscrowUnlockTime] = useState(null)
    const [secondsRemaining, setSecondsRemaining] = useState(0)
    const [selectedAsset, setSelectedAsset] = useState(DEFAULT_ASSET)
    const [settlementType, setSettlementType] = useState('escrow')

    const {
        connected,
        accountAddress,
        walletManager,
        sign
    } = useWallet()

    const connectorRef = useRef(null)

    // Called both when walletManager first loads AND when role changes (new DOM node)
    function initConnector(node) {
        connectorRef.current = node
        if (node && walletManager) {
            node.setWalletManager(walletManager)
        }
    }

    useEffect(() => {
        if (connectorRef.current && walletManager) {
            connectorRef.current.setWalletManager(walletManager)
        }
    }, [walletManager])

    function openConnector() {
        connectorRef.current?.open()
    }

    // When supplier connects their Xaman wallet, publish their address so buyer can use it as escrow destination
    useEffect(() => {
        if (role === 'supplier' && connected && accountAddress && urlTradeId) {
            fetch('/api/trade-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tradeId: urlTradeId, supplierWallet: { address: accountAddress } })
            })
        }
    }, [role, connected, accountAddress, urlTradeId])

    const applyServerState = useCallback((state) => {
        if (state.supplierWallet) setSupplierWallet(state.supplierWallet)
        if (state.agentResult) setAgentResult(state.agentResult)
        if (state.escrowResult) {
            setEscrowResult(state.escrowResult)
            if (state.escrowUnlockTime) setEscrowUnlockTime(state.escrowUnlockTime)
        }
        if (state.checkResult) setCheckResult(state.checkResult)
        if (state.trade) setTrade(state.trade)
        if (state.settlementType) setSettlementType(state.settlementType)
    }, [])

    // Load initial server state when tradeId is known
    useEffect(() => {
        if (!urlTradeId) return
        fetch(`/api/trade-state?tradeId=${urlTradeId}`)
            .then(r => r.json())
            .then(applyServerState)
    }, [urlTradeId, applyServerState])

    // Poll server state every 2s
    useEffect(() => {
        if (!urlTradeId) return
        const interval = setInterval(() => {
            fetch(`/api/trade-state?tradeId=${urlTradeId}`)
                .then(r => r.json())
                .then(applyServerState)
        }, 2000)
        return () => clearInterval(interval)
    }, [urlTradeId, applyServerState])

    useEffect(() => {
        if (!escrowUnlockTime) {
            return;
        }

        const timer = setInterval(() => {
            const remaining =
                Math.max(
                    0,
                    Math.floor(
                        (escrowUnlockTime - Date.now()) /
                        1000
                    )
                );

            setSecondsRemaining(
                remaining
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [escrowUnlockTime]);

    async function saveServerState(patch) {
        if (!tradeId) return
        await fetch('/api/trade-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tradeId, ...patch })
        })
    }

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


    // Restore supplier link if tradeId already in URL
    useEffect(() => {
        if (urlTradeId && role === 'buyer') {
            setSupplierLink(`${window.location.origin}${window.location.pathname}?tradeId=${urlTradeId}&role=supplier`)
        }
    }, [urlTradeId, role])

    async function createTrade() {
        if (tradeId) return // prevent creating a new trade if one already exists

        const res = await fetch('/api/create-trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplier: 'ACME Export GmbH', buyer: 'Swiss Import AG', amount: 1 })
        })

        const data = await res.json()
        setTrade(data)
        setTradeId(data.tradeId)

        const params = new URLSearchParams({ tradeId: data.tradeId, role: 'buyer' })
        router.replace(`?${params}`)

        await fetch('/api/trade-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tradeId: data.tradeId, trade: data })
        })

        setSupplierLink(`${window.location.origin}${window.location.pathname}?tradeId=${data.tradeId}&role=supplier`)
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
        await saveServerState({ agentResult: data })
    }

    async function setupTrustlines() {
        try {
            setLoading(true)
            setTrustlineError(null)

            // Buyer trust line — browser-signed via Xaman
            if (!connected) throw new Error('Connect your wallet first, then click Setup Trust Lines again')
            if (!trustlineStatus.buyer) {
                const buyerTrustTx = {
                    TransactionType: 'TrustSet',
                    Account: accountAddress,
                    LimitAmount: {
                        currency: selectedAsset.currency,
                        issuer: selectedAsset.issuer,
                        value: '1000000000'
                    },
                    Flags: 131072 // tfSetNoRipple
                }
                const buyerResult = await sign(buyerTrustTx)
                if (!buyerResult?.tx_blob) throw new Error('No signed trust line transaction from wallet')

                const buyerRes = await fetch('/api/setup-trustline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txBlob: buyerResult.tx_blob })
                })
                const buyerData = await buyerRes.json()
                if (!buyerData.success) throw new Error(`Buyer trust line failed: ${buyerData.transactionResult || buyerData.error}`)
                setTrustlineStatus(prev => ({ ...prev, buyer: true, supplier: true }))
            }
        } catch (err) {
            if (err.code === 'SIGN_FAILED') {
                setTrustlineError('Wallet signing cancelled — click Setup Trust Lines to retry')
            } else {
                setTrustlineError(err.message)
                console.error(err)
            }
        } finally {
            setLoading(false)
        }
    }

    async function reserveFunds() {
        if (!connected) {
            alert('Please connect your wallet first — click Connect Wallet and approve in Crossmark/Xaman.')
            return
        }
        if (!supplierWallet?.address) {
            alert('Supplier has not set up their wallet yet. Ask them to open the Supplier view and generate a wallet.')
            return
        }

        try {
            setLoading(true)

            if (selectedAsset.settlementType === 'escrow') {
                const finishAfter = xrpl.isoTimeToRippleTime(
                    new Date(Date.now() + 30000).toISOString()
                )
                const tx = {
                    TransactionType: 'EscrowCreate',
                    Account: accountAddress,
                    Destination: supplierWallet.address,
                    Amount: selectedAsset.buildAmount(trade.amount),
                    FinishAfter: finishAfter
                }
                const result = await sign(tx)
                if (!result?.tx_blob) throw new Error('No signed transaction returned from wallet')

                const res = await fetch('/api/create-escrow', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txBlob: result.tx_blob })
                })
                const data = await res.json()
                const unlockTime = (data.finishAfter + 946684800) * 1000
                setEscrowResult(data)
                setEscrowUnlockTime(unlockTime)
                await saveServerState({ escrowResult: data, escrowUnlockTime: unlockTime, settlementType: 'escrow', checkResult: null })

            } else {
                // RLUSD: CheckCreate — buyer writes a cheque to supplier
                const tx = {
                    TransactionType: 'CheckCreate',
                    Account: accountAddress,
                    Destination: supplierWallet.address,
                    SendMax: selectedAsset.buildAmount(trade.amount)
                }
                const result = await sign(tx)
                if (!result?.tx_blob) throw new Error('No signed transaction returned from wallet')

                const res = await fetch('/api/create-check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txBlob: result.tx_blob })
                })
                const data = await res.json()
                setCheckResult(data)
                await saveServerState({ checkResult: data, settlementType: 'check', escrowResult: null, escrowUnlockTime: null })
            }

        } catch (err) {
            if (err.code === 'SIGN_FAILED') {
                console.log('User cancelled signing')
            } else {
                console.error(err)
            }
        } finally {
            setLoading(false)
        }
    }

    async function confirmDelivery() {
        if (!connected) {
            alert('Connect your Xaman wallet first to sign the payment release.')
            return
        }
        try {
            setLoading(true)

            let tx
            if (settlementType === 'escrow') {
                tx = {
                    TransactionType: 'EscrowFinish',
                    Account: accountAddress,
                    Owner: escrowResult.owner,
                    OfferSequence: escrowResult.offerSequence
                }
                console.log('EscrowFinish tx:', JSON.stringify(tx))
            } else {
                tx = {
                    TransactionType: 'CheckCash',
                    Account: accountAddress,
                    CheckID: checkResult.checkId,
                    Amount: {
                        currency: '524C555344000000000000000000000000000000',
                        issuer: 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV',
                        value: String(trade.amount)
                    }
                }
            }

            const signed = await sign(tx)
            console.log('Signed result:', JSON.stringify(signed))
            if (!signed?.tx_blob) throw new Error('Signing cancelled or failed')

            const res = await fetch('/api/submit-signed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txBlob: signed.tx_blob })
            })
            const data = await res.json()

            setReleaseResult(data)
            await saveServerState({ escrowResult: null, escrowUnlockTime: null, checkResult: null, trade: null })
        } catch (err) {
            if (err.code !== 'SIGN_FAILED') console.error(err)
        } finally {
            setLoading(false)
        }
    }

    function selectRole(r) {
        setRole(r)
        // Preserve tradeId in URL if already present
        const params = new URLSearchParams(searchParams)
        params.set('role', r)
        router.replace(`?${params}`)
    }

    if (!role) {
        return (
            <div className="flex flex-col items-center justify-center gap-8 py-16">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Who are you in this trade?</h2>
                    <p className="text-base-content/60 text-sm">Your role determines what actions you can take.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6 w-full max-w-xl">
                    <button
                        className="card bg-base-100 border-2 border-primary hover:shadow-lg transition-shadow cursor-pointer p-8 text-left"
                        onClick={() => selectRole('buyer')}
                    >
                        <div className="text-4xl mb-3">🏦</div>
                        <h3 className="text-lg font-bold text-primary mb-1">Buyer</h3>
                        <p className="text-sm text-base-content/60">Create trades, reserve funds in escrow, and release payment on delivery.</p>
                    </button>
                    <button
                        className="card bg-base-100 border-2 border-secondary hover:shadow-lg transition-shadow cursor-pointer p-8 text-left"
                        onClick={() => selectRole('supplier')}
                    >
                        <div className="text-4xl mb-3">🚢</div>
                        <h3 className="text-lg font-bold text-secondary mb-1">Supplier</h3>
                        <p className="text-sm text-base-content/60">View incoming payment commitments and confirm delivery to release funds.</p>
                    </button>
                </div>
            </div>
        )
    }

    if (role === 'supplier') {
        return (
            <div className="flex flex-col gap-6">
                <div className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body">
                        <h2 className="text-xl font-bold">Supplier View</h2>
                        <p className="text-sm text-base-content/60">Confirm delivery to release payment from escrow.</p>
                    </div>
                </div>

                <div className="card bg-base-100 shadow-sm border border-base-300">
                    <div className="card-body">
                        <h2 className="text-lg font-semibold mb-4">Your Wallet</h2>
                        <div className="flex items-center gap-3">
                            <button
                                className={`btn btn-sm w-fit ${connected ? 'btn-success' : 'btn-secondary'}`}
                                onClick={openConnector}
                            >
                                {connected ? '✓ Wallet Connected' : 'Connect Wallet '}
                            </button>
                        </div>
                        {accountAddress && (
                            <div className="mt-3 space-y-1 text-sm">
                                <p><strong>Address:</strong></p>
                                <p className="font-mono break-all">{accountAddress}</p>
                                <SupplierBalance address={accountAddress} />
                            </div>
                        )}
                    </div>
                </div>

                {(escrowResult || checkResult) && (
                    <div className="card bg-base-100 shadow-sm border border-base-300">
                        <div className="card-body">
                            <h2 className="text-lg font-semibold mb-2">Incoming Payment</h2>
                            <div className="alert alert-info">
                                <div>
                                    <p className="font-semibold">💰 Funds locked for you</p>
                                    <p className="text-sm mt-1">
                                        {escrowResult ? 'XRP held in XRPL Escrow' : 'RLUSD Check ready to cash'}
                                    </p>
                                    <p className="text-sm mt-1">
                                        Tx: <a
                                            href={`https://testnet.xrpl.org/transactions/${(escrowResult || checkResult).hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="link"
                                        >
                                            {(escrowResult || checkResult).hash?.slice(0, 12)}...
                                        </a>
                                    </p>
                                </div>
                            </div>
                            {escrowResult && secondsRemaining > 0 && (
                                <div className="alert alert-warning mt-2">
                                    ⏳ Unlocks in {secondsRemaining} seconds
                                </div>
                            )}
                            <button
                                className="btn btn-success mt-4"
                                disabled={loading || !connected || (!escrowResult && !checkResult) || (escrowResult && secondsRemaining > 0)}
                                onClick={confirmDelivery}
                            >
                                {loading ? 'Processing...' : 'Confirm Delivery & Release Payment'}
                            </button>
                            {releaseResult?.success && (
                                <div className="alert alert-success mt-4">
                                    <p className="font-semibold">✅ Payment received!</p>
                                    <a href={`https://testnet.xrpl.org/transactions/${releaseResult.hash}`} target="_blank" rel="noopener noreferrer" className="link text-sm">
                                        {releaseResult.hash?.slice(0, 12)}...
                                    </a>
                                </div>
                            )}
                            {releaseResult && !releaseResult.success && (
                                <div className="alert alert-error mt-2">
                                    <p>❌ Failed: {releaseResult.transactionResult}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!escrowResult && !checkResult && (
                    <div className="card bg-base-100 shadow-sm border border-base-300">
                        <div className="card-body text-center text-base-content/50 py-12">
                            <p className="text-4xl mb-3">⏳</p>
                            <p>Waiting for buyer to reserve funds...</p>
                        </div>
                    </div>
                )}

                <xrpl-wallet-connector ref={initConnector} />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">

            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body flex-row items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Buyer View</h2>
                        <p className="text-sm text-base-content/60">Create trade, reserve funds, and confirm delivery.</p>
                    </div>
                </div>
            </div>

            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body">

                    <h2 className="text-lg font-semibold mb-4">Your Wallet</h2>

                    <div className="flex items-center gap-3">
                        <button
                            className={`btn btn-sm w-fit ${connected ? 'btn-success' : 'btn-primary'}`}
                            onClick={openConnector}
                        >
                            {connected ? '✓ Wallet Connected' : 'Connect Wallet'}
                        </button>
                        {accountAddress && !connected && (
                            <span className="text-xs text-warning">Click to re-authenticate</span>
                        )}
                    </div>

                    {accountAddress && (
                        <div className="mt-3 text-sm space-y-1">
                            <p><strong>Address:</strong></p>
                            <p className="font-mono break-all">{accountAddress}</p>
                        </div>
                    )}

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
                            <strong>Amount:</strong> {trade?.amount ?? 1} {selectedAsset.label}
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
                            disabled={!!tradeId}
                        >
                            {tradeId ? '✅ Trade Created' : 'Create Trade'}
                        </button>

                        {supplierLink && (
                            <div className="alert alert-success mt-2">
                                <div className="w-full">
                                    <p className="font-semibold text-sm mb-1">Share this link with your supplier:</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs break-all flex-1">{supplierLink}</code>
                                        <button
                                            className="btn btn-xs btn-outline"
                                            onClick={() => navigator.clipboard.writeText(supplierLink)}
                                        >Copy</button>
                                    </div>
                                </div>
                            </div>
                        )}

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

                        <div className="mt-4">
                            <p className="text-sm font-semibold mb-2">
                                Settlement Asset
                            </p>
                            <div className="flex gap-2">
                                {ASSET_LIST.map(asset => (
                                    <button
                                        key={asset.id}
                                        className={`btn btn-sm ${selectedAsset.id === asset.id
                                            ? 'btn-primary'
                                            : 'btn-outline'
                                            }`}
                                        onClick={() => {
                                            setSelectedAsset(asset)
                                            setSettlementType(asset.settlementType)
                                            setTrustlineStatus({ buyer: false, supplier: false })
                                            setTrustlineError(null)
                                            setCheckResult(null)
                                            setEscrowResult(null)
                                        }}
                                    >
                                        {asset.label}
                                    </button>
                                ))}
                            </div>

                            {selectedAsset.settlementType === 'check' && (
                                <div className="mt-3">
                                    <div className="alert alert-info text-sm py-2 mb-2">
                                        <span>RLUSD uses XRPL Checks (not Escrow). Both wallets need a trust line first.</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span>{trustlineStatus.supplier ? '✅' : '⬜'} Supplier trust line</span>
                                            <span>{trustlineStatus.buyer ? '✅' : '⬜'} Buyer trust line</span>
                                        </div>
                                        <button
                                            className="btn btn-outline btn-sm w-fit"
                                            disabled={loading || (trustlineStatus.buyer && trustlineStatus.supplier)}
                                            onClick={setupTrustlines}
                                        >
                                            {trustlineStatus.buyer && trustlineStatus.supplier
                                                ? '✅ Trust Lines Ready'
                                                : loading ? 'Setting up...' : 'Setup RLUSD Trust Lines'}
                                        </button>
                                        {trustlineError && (
                                            <p className="text-error text-sm">{trustlineError}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-sm">
                            {supplierWallet?.address ? (
                                <p className="text-success">✅ Supplier connected: <span className="font-mono">{supplierWallet.address.slice(0, 8)}...{supplierWallet.address.slice(-4)}</span></p>
                            ) : (
                                <p className="text-warning">⏳ Waiting for supplier to connect their wallet...</p>
                            )}
                        </div>

                        <button
                            className="btn btn-secondary mt-2"
                            disabled={
                                !connected ||
                                !agentResult?.approved ||
                                !supplierWallet?.address ||
                                loading ||
                                (selectedAsset.settlementType === 'check' && !(trustlineStatus.buyer && trustlineStatus.supplier))
                            }
                            onClick={reserveFunds}
                        >
                            {loading ? 'Processing...' : `Reserve Funds in ${selectedAsset.label}`}
                        </button>

                        {(escrowResult || checkResult) && (
                            <div className="alert alert-info mt-4">
                                <div>
                                    <p className="font-semibold">
                                        ✅ Funds Reserved
                                    </p>
                                    <p className="mt-2">
                                        {escrowResult ? 'XRPL Escrow Hash:' : 'XRPL Check Hash:'}
                                    </p>


                                    <p className="text-sm mt-1">
                                        Tx: <a
                                            href={`https://testnet.xrpl.org/transactions/${(escrowResult || checkResult).hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="link"
                                        >
                                            {(escrowResult || checkResult).hash?.slice(0, 12)}...
                                        </a>
                                    </p>
                                </div>
                            </div>
                        )}

                        {escrowResult && (
                            <div className="alert alert-info mt-2">
                                {secondsRemaining > 0
                                    ? <p className="text-sm">⏳ Escrow unlocks in <strong>{secondsRemaining}s</strong> — supplier can confirm delivery after this.</p>
                                    : <p className="text-sm">✅ Escrow unlocked — waiting for supplier to confirm delivery.</p>
                                }
                            </div>
                        )}
                        {checkResult && (
                            <div className="alert alert-info mt-2">
                                <p className="text-sm">💼 Check issued — waiting for supplier to cash it.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <xrpl-wallet-connector ref={initConnector} />

        </div >
    )
}
