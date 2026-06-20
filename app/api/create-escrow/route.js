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
        );
        const txResult =
            response.result.meta.TransactionResult;

        if (txResult !== "tesSUCCESS") {

            return NextResponse.json(
                {
                    success: false,
                    transactionResult: txResult
                },
                {
                    status: 400
                }
            );
        }

        console.log(
            JSON.stringify(
                response,
                null,
                2
            )
        )
        await client.disconnect();

        const escrowNode =
            response.result.meta.AffectedNodes.find(
                node =>
                    node.CreatedNode?.LedgerEntryType ===
                    "Escrow"
            );

        const escrowSequence =
            escrowNode?.CreatedNode?.NewFields?.Sequence;

        return NextResponse.json({
            success: true,
            hash: response.result.hash,
            offerSequence: escrowSequence,
            owner: wallet.classicAddress,
            finishAfter
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