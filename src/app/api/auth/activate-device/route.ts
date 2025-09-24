import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const { deviceFingerprint, userAgent, ownerId, phone, email, firebaseUid } = await request.json();
        
        if (!deviceFingerprint || !userAgent) {
            return NextResponse.json(
                { error: "Device fingerprint and user agent are required" },
                { status: 400 }
            );
        }

        // Find owner in Firestore using provided information
        let owner = null;
        
        // Try to find by ownerId first if provided
        if (ownerId) {
            owner = await firestoreAdminService.read("users", ownerId);
        }
        
        // If not found by ID, try by phone or email
        if (!owner && phone) {
            const phoneUsers = await firestoreAdminService.query(
                "users",
                [{ field: "phone", op: "==", value: phone }]
            );
            if (phoneUsers.length > 0) {
                owner = phoneUsers[0];
            }
        }
        
        if (!owner && email) {
            const emailUsers = await firestoreAdminService.query(
                "users",
                [{ field: "email", op: "==", value: email }]
            );
            if (emailUsers.length > 0) {
                owner = emailUsers[0];
            }
        }

        if (!owner) {
            return NextResponse.json(
                { error: "Owner profile not found" },
                { status: 404 }
            );
        }

        // Ensure we have the owner ID
        const resolvedOwnerId = (owner as any).id;
        if (!resolvedOwnerId) {
            return NextResponse.json(
                { error: "Owner ID not found" },
                { status: 404 }
            );
        }

        // Find or create device session
        const deviceSession = await firestoreAdminService.deviceSessions.getByUserAndDevice(
            resolvedOwnerId,
            deviceFingerprint
        );

        if (deviceSession) {
            // Update existing session to active
            await firestoreAdminService.update("deviceSessions", deviceSession.id!, {
                isActive: true,
                lastUsedAt: Timestamp.now(),
                userAgent, // Update user agent in case it changed
            });
        } else {
            // Create new device session
            await firestoreAdminService.deviceSessions.create({
                userId: resolvedOwnerId,
                deviceFingerprint,
                userAgent,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                lastUsedAt: Timestamp.now(),
                isActive: true,
            });
        }

        // Update Firebase UID if provided
        if (firebaseUid) {
            await firestoreAdminService.update("users", resolvedOwnerId, {
                firebaseUid: firebaseUid,
            });
            console.log(`Updated user ${resolvedOwnerId} with Firebase UID: ${firebaseUid}`);
        }

        return NextResponse.json({
            success: true,
            message: "Device activated successfully",
            owner: {
                id: (owner as any).id,
                firstName: (owner as any).firstName,
                lastName: (owner as any).lastName,
                email: (owner as any).email,
                phone: (owner as any).phone,
                compoundId: (owner as any).compoundId,
            },
        });

    } catch (error: unknown) {
        console.error("Activate device error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to activate device" },
            { status: 500 }
        );
    }
}
