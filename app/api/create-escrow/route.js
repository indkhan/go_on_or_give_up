import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    try {
        const {
            buyerSeed,
            supplierAddress,
            amount
        } = await request.json();

        const client =
            new xrpl.Client(
                process.env.NEXT_PUBLIC_CLIENT
            );

        await client.connect();

        const wallet =
            xrpl.Wallet.fromSeed(
                buyerSeed
            );

        // Funds cannot be released for 60 seconds.
        const finishAfter =
            xrpl.isoTimeToRippleTime(
                new Date(
                    Date.now() + 60000
                ).toISOString()
            );

        const tx = {
            TransactionType: "EscrowCreate",
            Account: wallet.classicAddress,
            Destination: supplierAddress,
            Amount: xrpl.xrpToDrops(amount),
            FinishAfter: finishAfter
        };

        const response =
            await client.submitAndWait(
                tx,
                { wallet }
            );

        console.log(
            JSON.stringify(
                response,
                null,
                2
            )
        )
        await client.disconnect();

        return NextResponse.json({
            success: true,
            hash: response.result.hash,
            offerSequence: response.result.Sequence,
            owner: wallet.classicAddress
        });
    }
    catch (error) {
        return NextResponse.json(
            {
                error: error.message
            },
            {
                status: 500
            }
        );
    }
}