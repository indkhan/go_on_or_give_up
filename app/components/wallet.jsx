'use client'

import { useEffect, useRef } from 'react'
import { useWallet } from '../context/WalletContext'

export default function WalletPage() {

    const {
        connected,
        accountAddress,
        walletName,
        walletManager,
        disconnect,
        error
    } = useWallet()

    const connectorRef = useRef(null)

    useEffect(() => {

        if (connectorRef.current && walletManager) {
            connectorRef.current.setWalletManager(walletManager)
        }

    }, [walletManager])

    function openConnector() {
        connectorRef.current?.open()
    }

    return (
        <div className="min-h-screen p-6">

            <div className="max-w-2xl mx-auto">

                <h1 className="text-3xl font-bold mb-6">
                    XRPL Wallet Connection
                </h1>

                <div className="card bg-base-100 shadow-xl border border-base-300">

                    <div className="card-body">

                        <h2 className="card-title">
                            Wallet Status
                            <div className="alert alert-info">
                                Connected:
                                {" "}
                                {connected ? "YES" : "NO"}
                            </div>
                        </h2>

                        {!connected && (
                            <div className="space-y-4">

                                <p>
                                    Connect a supported XRPL wallet.
                                </p>

                                <button
                                    className="btn btn-primary"
                                    onClick={openConnector}
                                >
                                    Connect Wallet
                                </button>

                            </div>
                        )}

                        {connected && (
                            <div className="space-y-4">

                                <div className="alert alert-success">
                                    <span>Wallet Connected</span>
                                </div>

                                <div>
                                    <p className="font-semibold">Wallet</p>
                                    <p>{walletName}</p>
                                </div>

                                <div>
                                    <p className="font-semibold">Address</p>
                                    <p className="font-mono break-all">
                                        {accountAddress}
                                    </p>
                                </div>

                                <button
                                    className="btn btn-error"
                                    onClick={disconnect}
                                >
                                    Disconnect
                                </button>

                            </div>
                        )}

                        {error && (
                            <div className="alert alert-error mt-4">
                                <span>
                                    {error.message || 'Wallet connection failed'}
                                </span>
                            </div>
                        )}

                    </div>

                </div>

            </div>

            {/* xrpl-connect web component — handles wallet picker + QR modal */}
            <xrpl-wallet-connector ref={connectorRef} />

        </div>
    )
}
