import { NextResponse } from "next/server";
import xrpl from "xrpl";

export async function POST(request) {
    const client = new xrpl.Client(process.env.NEXT_PUBLIC_CLIENT)
    try {
        const { address } = await request.json();

        if (!address) {
            return NextResponse.json({ error: 'address is required' }, { status: 400 })
        }

        await client.connect();

        const response = await client.request({
            command: "account_info",
            account: address,
            ledger_index: "validated"
        });

        const balanceXrp = xrpl.dropsToXrp(response.result.account_data.Balance);

        return NextResponse.json({ address, balanceXrp });

    } catch (error) {
        console.error("ACCOUNT INFO ERROR:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        try { await client.disconnect() } catch {}
    }
}
