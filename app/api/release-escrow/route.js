import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    try {
        const {
            supplierSeed,
            owner,
            offerSequence
        } = await request.json();

        const client = new xrpl.Client(
            process.env.NEXT_PUBLIC_CLIENT
        );

        await client.connect();

        const wallet =
            xrpl.Wallet.fromSeed(supplierSeed);
        console.log({ supplierSeed, owner, offerSequence });

        const tx = {
            TransactionType: "EscrowFinish",
            Account: wallet.classicAddress,
            Owner: owner,
            OfferSequence: offerSequence
        };

        const response =
            await client.submitAndWait(
                tx,
                { wallet }
            );

        await client.disconnect();

        return NextResponse.json({
            success: true,
            hash: response.result.hash
        });
    }
    catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}