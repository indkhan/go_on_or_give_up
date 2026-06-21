import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

// Only fill Fee and LastLedgerSequence — let the browser wallet (Xaman/Crossmark)
// handle Sequence itself, since it tracks the account state on its own node.
export async function POST(request) {
    try {
        const { tx } = await request.json()
        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()

        const [feeRes, ledgerRes] = await Promise.all([
            client.request({ command: 'fee' }),
            client.request({ command: 'ledger', ledger_index: 'current' })
        ])
        await client.disconnect()

        const filled = {
            ...tx,
            Fee: feeRes.result.drops.open_ledger_fee ?? '12',
            LastLedgerSequence: ledgerRes.result.ledger_current_index + 20
        }

        return NextResponse.json({ tx: filled })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
