import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const trade = await request.json();

        const approved =
            trade.amount < 50000;

        return NextResponse.json({
            tradeId: trade.tradeId,
            approved,
            decision: approved
                ? "Escrow Approved"
                : "Manual Approval Required"
        });
    }
    catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}