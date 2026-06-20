import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    try {
        const { address } = await request.json();

        const client = new xrpl.Client(
            process.env.NEXT_PUBLIC_CLIENT
        );

        await client.connect();

        const response = await client.request({
            command: "account_info",
            account: address
        });

        await client.disconnect();

        const balanceXrp =
            xrpl.dropsToXrp(
                response.result.account_data.Balance
            );

        return NextResponse.json({
            address,
            balanceXrp
        });
    }
    catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}