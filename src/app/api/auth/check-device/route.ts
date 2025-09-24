import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

export async function POST(request: NextRequest) {
    try {
        const { deviceFingerprint, userAgent } = await request.json();
        
        if (!deviceFingerprint || !userAgent) {
            return NextResponse.json(
                { error: "Device fingerprint and user agent are required" },
                { status: 400 }
            );
        }

        // Check for existing device sessions first
        const deviceSessions = await firestoreAdminService.query(
            "deviceSessions",
            [
                { field: "deviceFingerprint", op: "==", value: deviceFingerprint },
                { field: "isActive", op: "==", value: true }
            ]
        );

        if (deviceSessions.length === 0) {
            // No active device session found - user needs to authenticate
            return NextResponse.json(
                { error: "No active device session found" },
                { status: 401 }
            );
        }

        const deviceSession = deviceSessions[0];
        
        // Get the owner associated with this device session
        const owner = await firestoreAdminService.read("users", (deviceSession as any).userId);
        
        if (!owner) {
            return NextResponse.json(
                { error: "Owner profile not found" },
                { status: 404 }
            );
        }

        // Check if user has password set up
        const hasPassword = (owner as any).hasPassword || false;
        const isFirstTimeLogin = (owner as any).isFirstTimeLogin !== false; // Default to true for existing users

        const isKnownDevice = (deviceSession as any).isActive;
        const requiresOTP = !hasPassword || isFirstTimeLogin || !isKnownDevice;

        return NextResponse.json({
            owner: {
                id: (owner as any).id,
                firstName: (owner as any).firstName,
                lastName: (owner as any).lastName,
                email: (owner as any).email,
                phone: (owner as any).phone,
                hasPassword,
                isFirstTimeLogin,
            },
            deviceSession: {
                isKnownDevice,
                requiresOTP,
                lastUsedAt: (deviceSession as any).lastUsedAt,
            },
            requiresOTP,
        });

    } catch (error: unknown) {
        console.error("Check device error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to check device" },
            { status: 500 }
        );
    }
}
