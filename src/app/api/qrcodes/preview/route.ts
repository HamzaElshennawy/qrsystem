/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
import { qrService } from "@/firebase/qr";
import { authService } from "@/firebase/auth";

export async function POST(request: NextRequest) {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { ownerId, compoundId } = await request.json();

        if (!ownerId || !compoundId) {
            return NextResponse.json(
                { error: "ownerId and compoundId are required" },
                { status: 400 }
            );
        }

        // Verify the user owns this compound
        const compound = await firestoreService.compounds.getById(compoundId);
        if (!compound || compound.adminId !== currentUser.uid) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        // Get the owner
        const owner = await firestoreService.owners.getById(ownerId);
        if (!owner || owner.compoundId !== compoundId) {
            return NextResponse.json(
                { error: "Owner not found" },
                { status: 404 }
            );
        }

        // Generate QR code preview
        const qrResult = await qrService.generateOwnerQRCode(owner, compoundId);

        return NextResponse.json({
            success: true,
            dataURL: qrResult.dataURL,
            qrData: qrResult.qrData,
        });
    } catch (error: any) {
        console.error("Preview QR code error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate QR code preview" },
            { status: 500 }
        );
    }
}
