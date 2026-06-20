import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const trade = await request.json();

        return NextResponse.json({
            tradeId:
                "T-" + Date.now(),
            supplier:
                trade.supplier,
            buyer:
                trade.buyer,
            amount:
                trade.amount,
            status:
                "PendingAgentReview"
        });
    }
    catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}