/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
// Deprecated: server-side CSV import has been moved client-side

export const runtime = "edge";

export async function POST(request: NextRequest) {
    try {
        return NextResponse.json(
            {
                error:
                    "CSV import is handled client-side using Firestore rules. Use the dashboard Import CSV modal.",
            },
            { status: 400 }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                error: `Import failed: ${
                    error.message || "Unknown error occurred"
                }`,
            },
            { status: 500 }
        );
    }
}
