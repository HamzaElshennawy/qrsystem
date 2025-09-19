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

        const { compoundId, ownerIds } = await request.json();

        if (!compoundId) {
            return NextResponse.json(
                { error: "compoundId is required" },
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

        let owners = [];
        let qrCodeIds = [];

        if (ownerIds && ownerIds.length > 0) {
            // Generate QR codes for specific owners
            for (const ownerId of ownerIds) {
                const owner = await firestoreService.owners.getById(ownerId);
                if (owner && owner.compoundId === compoundId) {
                    owners.push(owner);
                }
            }
        } else {
            // Generate QR codes for all owners without QR codes
            const allOwners = await firestoreService.owners.getByCompound(
                compoundId
            );
            const existingQrCodes =
                await firestoreService.qrCodes.getByCompound(compoundId);
            const existingOwnerIds = existingQrCodes.map((qr) => qr.ownerId);

            owners = allOwners.filter(
                (owner) => !existingOwnerIds.includes(owner.id!)
            );
        }

        if (owners.length === 0) {
            return NextResponse.json(
                { error: "No owners found to generate QR codes for" },
                { status: 400 }
            );
        }

        // Generate QR codes
        qrCodeIds = await qrService.bulkGenerateQRCodes(
            owners,
            compoundId,
            currentUser.uid
        );

        return NextResponse.json({
            success: true,
            qrCodeIds,
            count: owners.length,
            message: `Successfully generated ${owners.length} QR codes`,
        });
    } catch (error: any) {
        console.error("Bulk generate QR codes error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate QR codes" },
            { status: 500 }
        );
    }
}
