/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
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

        const { compoundId, firstName, lastName, email, propertyUnit } = await request.json();

        if (!compoundId || !firstName || !lastName || !email) {
            return NextResponse.json(
                { error: "compoundId, firstName, lastName, and email are required" },
                { status: 400 }
            );
        }

        // Verify the compound exists
        const compound = await firestoreService.compounds.getById(compoundId);
        if (!compound) {
            return NextResponse.json(
                { error: "Compound not found" },
                { status: 404 }
            );
        }

        // Create owner with current user's phone number
        const userData = {
            compoundId,
            type: "owner" as const,
            firstName,
            lastName,
            email,
            phone: currentUser.phoneNumber || undefined,
            propertyUnit: propertyUnit || undefined,
            isActive: true,
            firebaseUid: currentUser.uid, // Store Firebase UID for future matching
            hasPassword: false,
            isFirstTimeLogin: true,
        };

        console.log("Creating owner with data:", userData);

        const userId = await firestoreService.users.create(userData);

        return NextResponse.json({
            success: true,
            userId,
            message: "Owner created successfully",
            debug: {
                createdWithPhone: currentUser.phoneNumber,
                createdWithUID: currentUser.uid,
                compoundId: compoundId
            }
        });
    } catch (error: any) {
        console.error("Create owner error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create owner" },
            { status: 500 }
        );
    }
}
