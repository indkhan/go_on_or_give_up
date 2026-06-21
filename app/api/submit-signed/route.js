import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

export async function POST(request) {
    try {
        const { txBlob } = await request.json()
        if (!txBlob) return NextResponse.json({ error: 'txBlob required' }, { status: 400 })

        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()
        const res = await client.submit(txBlob)
        await client.disconnect()

        console.log('submit result:', JSON.stringify(res.result))

        const engineResult = res.result.engine_result
        const accepted = res.result.accepted

        if (!accepted && !engineResult?.startsWith('tes')) {
            return NextResponse.json(
                { success: false, transactionResult: engineResult, error: res.result.engine_result_message },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            hash: res.result.tx_json?.hash ?? res.result.hash,
            engineResult
        })
    } catch (error) {
        console.error('submit-signed error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
