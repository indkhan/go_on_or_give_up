import { NextResponse } from 'next/server'
import xrpl from 'xrpl'

export async function POST() {
    try {

        const client = new xrpl.Client(
            process.env.NEXT_PUBLIC_CLIENT
        )

        await client.connect()

        const fundedWallet =
            await client.fundWallet()

        await client.disconnect()

        return NextResponse.json({
            address:
                fundedWallet.wallet.classicAddress,

            seed:
                fundedWallet.wallet.seed,

            funded: true
        })

    } catch (error) {

        return NextResponse.json(
            {
                error: error.message
            },
            {
                status: 500
            }
        )

    }
}