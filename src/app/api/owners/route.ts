/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
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

        let users = [];

        if (compoundId) {
            // Get users for a specific compound
            const compound = await firestoreService.compounds.getById(
                compoundId
            );
            if (!compound || compound.adminId !== currentUser.uid) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 403 }
                );
            }
            users = await firestoreService.users.getByCompound(compoundId);
        } else {
            // Get users for all compounds owned by the user
            const compounds = await firestoreService.compounds.getByAdmin(
                currentUser.uid
            );
            const allUsers = [];

            for (const compound of compounds) {
                const compoundUsers =
                    await firestoreService.users.getByCompound(compound.id!);
                allUsers.push(...compoundUsers);
            }

            users = allUsers;
        }

        return NextResponse.json({
            success: true,
            users,
        });
    } catch (error: any) {
        console.error("Get owners error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch owners" },
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

        const {
            firstName,
            lastName,
            email,
            phone,
            propertyUnit,
            compoundId,
            type,
        } = await request.json();

        if (!firstName || !lastName || !email || !compoundId || !type) {
            return NextResponse.json(
                {
                    error: "Required fields: firstName, lastName, email, compoundId, type",
                },
                { status: 400 }
            );
        }

        if (!["owner", "employee", "manager"].includes(type)) {
            return NextResponse.json(
                {
                    error: "Invalid user type. Must be owner, employee, or manager",
                },
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

        const userData = {
            compoundId,
            type,
            firstName,
            lastName,
            email,
            phone: phone || "",
            propertyUnit: propertyUnit || "",
            isActive: true,
        };

        const userId = await firestoreService.users.create(userData);

        return NextResponse.json({
            success: true,
            userId,
            message: "User created successfully",
        });
    } catch (error: any) {
        console.error("Create owner error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create owner" },
            { status: 500 }
        );
    }
}
