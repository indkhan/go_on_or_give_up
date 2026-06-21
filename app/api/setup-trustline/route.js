import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

const RLUSD_ISSUER = 'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV'
const RLUSD_CURRENCY_HEX = '524C555344000000000000000000000000000000'

// Two modes:
//   { seed }    — server-side signing (supplier wallet)
//   { txBlob }  — browser pre-signed (buyer wallet via Crossmark/Xaman)
export async function POST(request) {
    try {
        const body = await request.json()

        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()

        let response

        if (body.txBlob) {
            // Buyer: pre-signed TrustSet blob from browser wallet
            response = await client.submitAndWait(body.txBlob)
        } else if (body.seed) {
            // Supplier: sign server-side with seed
            const wallet = xrpl.Wallet.fromSeed(body.seed)
            response = await client.submitAndWait(
                {
                    TransactionType: 'TrustSet',
                    Account: wallet.address,
                    LimitAmount: {
                        currency: RLUSD_CURRENCY_HEX,
                        issuer: RLUSD_ISSUER,
                        value: '1000000000'
                    },
                    Flags: xrpl.TrustSetFlags.tfSetNoRipple
                },
                { autofill: true, wallet }
            )
        } else {
            await client.disconnect()
            return NextResponse.json({ error: 'seed or txBlob is required' }, { status: 400 })
        }

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
            hash: response.result.hash,
            account: response.result.Account
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
