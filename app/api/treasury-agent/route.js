import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const trade = await request.json();

        const thresholdCheck =
            trade.amount < 50000;

        const supplierCheck =
            trade.supplierApproved === true;

        const approved =
            thresholdCheck &&
            supplierCheck;

        return NextResponse.json({
            tradeId: trade.tradeId,
            approved,
            decision: approved
                ? "Escrow Approved"
                : "Manual Approval Required",
            policyChecks: {
                supplierApproved: supplierCheck,
                thresholdCheck: thresholdCheck
            }
        });
    }
    catch (error) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}