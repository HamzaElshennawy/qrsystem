/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";

export async function GET(request: NextRequest) {
    try {
        // For now, allow access without authentication for testing
        // In production, you would implement proper JWT token verification here
        
        // Get all compounds (for owner profile creation)
        const compounds = await firestoreService.query("compounds", []);
        
        // Return only basic info for security
        const compoundList = compounds.map(compound => ({
            id: compound.id,
            name: compound.name,
            address: compound.address,
        }));

        return NextResponse.json({
            success: true,
            compounds: compoundList,
        });
    } catch (error: any) {
        console.error("Get compounds error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch compounds" },
            { status: 500 }
        );
    }
}