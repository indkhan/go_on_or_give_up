import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    try {
        const {
            senderSeed,
            destination,
            amount
        } = await request.json();

        const client = new xrpl.Client(
            process.env.NEXT_PUBLIC_CLIENT
        );

        await client.connect();

        const wallet =
            xrpl.Wallet.fromSeed(senderSeed);

        const tx = {
            TransactionType: "Payment",
            Account: wallet.classicAddress,
            Destination: destination,
            Amount: xrpl.xrpToDrops(amount)
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