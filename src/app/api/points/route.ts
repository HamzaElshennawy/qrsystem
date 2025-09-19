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

        let entryPoints = [];

        if (compoundId) {
            // Get entry points for a specific compound
            const compound = await firestoreService.compounds.getById(
                compoundId
            );
            if (!compound || compound.adminId !== currentUser.uid) {
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 403 }
                );
            }
            entryPoints = await firestoreService.entryPoints.getByCompound(
                compoundId
            );
        } else {
            // Get entry points for all compounds owned by the user
            const compounds = await firestoreService.compounds.getByAdmin(
                currentUser.uid
            );
            const allEntryPoints = [];

            for (const compound of compounds) {
                const compoundEntryPoints =
                    await firestoreService.entryPoints.getByCompound(
                        compound.id!
                    );
                allEntryPoints.push(...compoundEntryPoints);
            }

            entryPoints = allEntryPoints;
        }

        return NextResponse.json({
            success: true,
            entryPoints,
        });
    } catch (error: unknown) {
        console.error("Get entry points error:", error);
        return NextResponse.json(
            {
                error:
                    (error as Error).message || "Failed to fetch entry points",
            },
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
            compoundId,
            name,
            location,
            isActive = true,
            settings = {
                allowAllOwners: true,
                allowedOwners: [],
                scanRequired: true,
                allowRenters: true,
                allowGuests: true,
            },
        } = await request.json();

        if (!compoundId || !name || !location) {
            return NextResponse.json(
                { error: "compoundId, name, and location are required" },
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

        const entryPointData = {
            compoundId,
            name,
            location,
            isActive,
            settings,
        };

        const entryPointId = await firestoreService.entryPoints.create(
            entryPointData
        );

        return NextResponse.json({
            success: true,
            entryPointId,
            message: "Entry point created successfully",
        });
    } catch (error: unknown) {
        console.error("Create entry point error:", error);
        return NextResponse.json(
            {
                error:
                    (error as Error).message || "Failed to create entry point",
            },
            { status: 500 }
        );
    }
}
