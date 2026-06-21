import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

const RLUSD_CURRENCY_HEX = '524C555344000000000000000000000000000000'
const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'

// Supplier cashes the RLUSD check after AI confirms delivery.
// checkId is the 64-char hex ledger object ID returned by create-check.
export async function POST(request) {
    try {
        const { supplierSeed, checkId, amount } = await request.json()

        if (!supplierSeed || !checkId || !amount) {
            return NextResponse.json(
                { error: 'supplierSeed, checkId, and amount are required' },
                { status: 400 }
            )
        }

        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()

        const supplierWallet = xrpl.Wallet.fromSeed(supplierSeed)

        const response = await client.submitAndWait(
            {
                TransactionType: 'CheckCash',
                Account: supplierWallet.address,
                CheckID: checkId,
                Amount: {
                    currency: RLUSD_CURRENCY_HEX,
                    issuer: RLUSD_ISSUER,
                    value: String(amount)
                }
            },
            { autofill: true, wallet: supplierWallet }
        )

        await client.disconnect()

        const txResult = response.result.meta?.TransactionResult
        if (txResult !== 'tesSUCCESS') {
            return NextResponse.json(
                { success: false, transactionResult: txResult },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            hash: response.result.hash
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
