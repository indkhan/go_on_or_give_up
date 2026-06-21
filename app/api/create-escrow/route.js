import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    try {
        const { txBlob } = await request.json();

        const client = new xrpl.Client(
            process.env.NEXT_PUBLIC_CLIENT
        );

        await client.connect();

        const response = await client.submitAndWait(txBlob);

        await client.disconnect();

        const txResult =
            response.result.meta.TransactionResult;

        if (txResult !== "tesSUCCESS") {
            return NextResponse.json(
                { success: false, transactionResult: txResult },
                { status: 400 }
            );
        }

        const escrowNode =
            response.result.meta.AffectedNodes.find(
                node =>
                    node.CreatedNode?.LedgerEntryType === "Escrow"
            );

        const offerSequence =
            escrowNode?.CreatedNode?.NewFields?.Sequence
            ?? response.result.tx_json?.Sequence

        const finishAfter =
            escrowNode?.CreatedNode?.NewFields?.FinishAfter

        const owner =
            escrowNode?.CreatedNode?.NewFields?.Account
            ?? response.result.tx_json?.Account

        console.log('Escrow created:', { offerSequence, finishAfter, owner, escrowNode: JSON.stringify(escrowNode) })

        return NextResponse.json({
            success: true,
            hash: response.result.hash,
            offerSequence,
            owner,
            finishAfter
        });

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
