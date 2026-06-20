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

        const escrowSequence =
            escrowNode?.CreatedNode?.NewFields?.Sequence;

        const finishAfter =
            escrowNode?.CreatedNode?.NewFields?.FinishAfter;

        return NextResponse.json({
            success: true,
            hash: response.result.hash,
            offerSequence: escrowSequence,
            owner: response.result.Account,
            finishAfter
        });

    } catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
