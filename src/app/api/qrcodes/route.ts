/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
import { qrService } from "@/firebase/qr";
import { authService } from "@/firebase/auth";

export async function GET(request: NextRequest) {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const compoundId = searchParams.get("compoundId");
        const ownerId = searchParams.get("ownerId");

        let qrCodes = [];

        if (ownerId) {
            // Get QR codes for a specific owner
            qrCodes = await firestoreService.qrCodes.getByOwner(ownerId);
        } else if (compoundId) {
            // Get QR codes for a specific compound
            const compound = await firestoreService.compounds.getById(
                compoundId
            );
            if (!compound || compound.adminId !== currentUser.uid) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 403 }
                );
            }
            qrCodes = await firestoreService.qrCodes.getByCompound(compoundId);
        } else {
            // Get QR codes for all compounds owned by the user
            const compounds = await firestoreService.compounds.getByAdmin(
                currentUser.uid
            );
            const allQrCodes = [];

            for (const compound of compounds) {
                const compoundQrCodes =
                    await firestoreService.qrCodes.getByCompound(compound.id!);
                allQrCodes.push(...compoundQrCodes);
            }

            qrCodes = allQrCodes;
        }

        return NextResponse.json({
            success: true,
            qrCodes,
        });
    } catch (error: any) {
        console.error("Get QR codes error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch QR codes" },
            { status: 500 }
        );
    }
}

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

        // Check if QR code already exists
        const existingQrCodes = await firestoreService.qrCodes.getByOwner(
            ownerId
        );
        if (existingQrCodes.length > 0) {
            return NextResponse.json(
                { error: "QR code already exists for this owner" },
                { status: 400 }
            );
        }

        // Generate QR code
        const qrCodeId = await qrService.createAndSaveQRCode(
            owner,
            compoundId,
            currentUser.uid
        );

        return NextResponse.json({
            success: true,
            qrCodeId,
            message: "QR code generated successfully",
        });
    } catch (error: any) {
        console.error("Generate QR code error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate QR code" },
            { status: 500 }
        );
    }
}
