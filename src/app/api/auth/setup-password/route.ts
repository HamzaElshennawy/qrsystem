import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";
import { authService } from "@/firebase/auth";
import { hashPassword, validatePasswordStrength } from "@/lib/password-utils";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
    try {
        const { password, confirmPassword, deviceFingerprint, userAgent, ownerId, phone, email, firebaseUid } = await request.json();
        
        if (!password || !confirmPassword || !deviceFingerprint || !userAgent) {
            return NextResponse.json(
                { error: "Password, confirm password, device fingerprint, and user agent are required" },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { error: "Password does not meet requirements", details: passwordValidation.errors },
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

        // As a fallback, try to get current Firebase user
        if (!owner) {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                if (currentUser.uid) {
                    const users = await firestoreAdminService.query(
                        "users",
                        [{ field: "firebaseUid", op: "==", value: currentUser.uid }]
                    );
                    if (users.length > 0) {
                        owner = users[0];
                    }
                }
                
                if (!owner && currentUser.phoneNumber) {
                    const phoneUsers = await firestoreAdminService.query(
                        "users",
                        [{ field: "phone", op: "==", value: currentUser.phoneNumber }]
                    );
                    if (phoneUsers.length > 0) {
                        owner = phoneUsers[0];
                    }
                }
                
                if (!owner && currentUser.email) {
                    const emailUsers = await firestoreAdminService.query(
                        "users",
                        [{ field: "email", op: "==", value: currentUser.email }]
                    );
                    if (emailUsers.length > 0) {
                        owner = emailUsers[0];
                    }
                }
            }
        }

        if (!owner) {
            return NextResponse.json(
                { error: "Owner profile not found" },
                { status: 404 }
            );
        }

        // Hash the password
        const passwordHash = await hashPassword(password);

        // Update owner with password and mark as no longer first time login
        const updateData: Record<string, unknown> = {
            hasPassword: true,
            passwordHash,
            isFirstTimeLogin: false,
        };
        
        // Update Firebase UID if provided
        if (firebaseUid) {
            updateData.firebaseUid = firebaseUid;
            console.log(`Updating user ${(owner as any).id} with Firebase UID: ${firebaseUid}`);
        }
        
        await firestoreAdminService.update("users", (owner as any).id!, updateData);

        // Create or update device session
        const existingSession = await firestoreAdminService.deviceSessions.getByUserAndDevice(
            (owner as any).id!,
            deviceFingerprint
        );

        if (existingSession) {
            // Update existing session
            await firestoreAdminService.update("deviceSessions", (existingSession as any).id!, {
                isActive: true,
                lastUsedAt: Timestamp.now(),
            });
        } else {
            // Create new device session
            await firestoreAdminService.deviceSessions.create({
                userId: (owner as any).id!,
                deviceFingerprint,
                userAgent,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
                lastUsedAt: Timestamp.now(),
                isActive: true,
            });
        }

        return NextResponse.json({
            success: true,
            message: "Password set up successfully",
        });

    } catch (error: unknown) {
        console.error("Setup password error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to set up password" },
            { status: 500 }
        );
    }
}
