import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";
import { verifyPassword } from "@/lib/password-utils";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const { email, phone, password, deviceFingerprint, userAgent, firebaseUid } = await request.json();
        
        if ((!email && !phone) || !password || !deviceFingerprint || !userAgent) {
            return NextResponse.json(
                { error: "Email or phone, password, device fingerprint, and user agent are required" },
                { status: 400 }
            );
        }

        // Find owner by email or phone
        let owner = null;
        
        if (email) {
            const emailUsers = await firestoreAdminService.query(
                "users",
                [{ field: "email", op: "==", value: email }]
            );
            if (emailUsers.length > 0) {
                owner = emailUsers[0];
            }
        }
        
        if (!owner && phone) {
            const phoneUsers = await firestoreAdminService.query(
                "users",
                [{ field: "phone", op: "==", value: phone }]
            );
            if (phoneUsers.length > 0) {
                owner = phoneUsers[0];
            }
        }

        if (!owner) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check if user has password set up
        if (!(owner as any).hasPassword || !(owner as any).passwordHash) {
            return NextResponse.json(
                { error: "Password not set up. Please use OTP verification first." },
                { status: 401 }
            );
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, (owner as any).passwordHash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check if this is a known device
        const deviceSession = await firestoreAdminService.deviceSessions.getByUserAndDevice(
            (owner as any).id!,
            deviceFingerprint
        );

        const isKnownDevice = deviceSession !== null && (deviceSession as any).isActive;
        const requiresOTP = !isKnownDevice;

        // If it's a known device, update last used time
        if (isKnownDevice && deviceSession) {
            await firestoreAdminService.deviceSessions.updateLastUsed((deviceSession as any).id!);
        }

        // Update Firebase UID if provided
        if (firebaseUid) {
            await firestoreAdminService.update("users", (owner as any).id!, {
                firebaseUid: firebaseUid,
            });
            console.log(`Updated user ${(owner as any).id} with Firebase UID: ${firebaseUid}`);
        }

        // If it's a new device, create device session but mark as requiring OTP
        if (!isKnownDevice) {
            await firestoreAdminService.deviceSessions.create({
                userId: (owner as any).id!,
                deviceFingerprint,
                userAgent,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                lastUsedAt: Timestamp.now(),
                isActive: false, // Will be activated after OTP verification
            });
        }

        return NextResponse.json({
            success: true,
            owner: {
                id: (owner as any).id,
                firstName: (owner as any).firstName,
                lastName: (owner as any).lastName,
                email: (owner as any).email,
                phone: (owner as any).phone,
                compoundId: (owner as any).compoundId,
            },
            deviceSession: {
                isKnownDevice,
                requiresOTP,
            },
            requiresOTP,
        });

    } catch (error: unknown) {
        console.error("Password login error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to authenticate" },
            { status: 500 }
        );
    }
}
