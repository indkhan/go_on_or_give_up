import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

// Accepts a signed txBlob for a CheckCreate transaction and submits it.
// The buyer signs CheckCreate in the browser; seed never reaches server.
export async function POST(request) {
    try {
        const { txBlob } = await request.json()

        if (!txBlob) {
            return NextResponse.json({ error: 'txBlob is required' }, { status: 400 })
        }

        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()

        const response = await client.submitAndWait(txBlob)
        await client.disconnect()

        const txResult = response.result.meta?.TransactionResult
        if (txResult !== 'tesSUCCESS') {
            return NextResponse.json(
                { success: false, transactionResult: txResult },
                { status: 400 }
            )
        }

        // The Check ledger object ID is the index of the CreatedNode
        const checkNode = response.result.meta.AffectedNodes.find(
            node => node.CreatedNode?.LedgerEntryType === 'Check'
        )

        const checkId = checkNode?.CreatedNode?.LedgerIndex
        const checkSequence = checkNode?.CreatedNode?.NewFields?.Sequence

        return NextResponse.json({
            success: true,
            hash: response.result.hash,
            checkId,
            checkSequence,
            sender: response.result.Account,
            destination: response.result.Destination
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
