import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

export async function POST(request) {
    const { account, limit = 10, marker } = await request.json()

    try {
        const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
        await client.connect()

        const response = await client.request({
            command: 'account_tx',
            account,
            limit,
            marker
        })

        await client.disconnect()
        return NextResponse.json(response.result)
    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}