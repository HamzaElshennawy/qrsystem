import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
import { authService } from "@/firebase/auth";
import type { EntryPoint } from "@/firebase/firestore";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const entryPoint = await firestoreService.read<EntryPoint>(
            "entryPoints",
            (
                await params
            ).id
        );

        if (!entryPoint) {
            return NextResponse.json(
                { error: "Entry point not found" },
                { status: 404 }
            );
        }

        // Verify the user owns the compound of this entry point
        const compound = await firestoreService.compounds.getById(
            entryPoint.compoundId
        );
        if (!compound || compound.adminId !== currentUser.uid) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        return NextResponse.json({
            success: true,
            entryPoint,
        });
    } catch (error: unknown) {
        console.error("Get entry point error:", error);
        return NextResponse.json(
            {
                error:
                    (error as Error).message || "Failed to fetch entry point",
            },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const entryPoint = await firestoreService.read<EntryPoint>(
            "entryPoints",
            (
                await params
            ).id
        );

        if (!entryPoint) {
            return NextResponse.json(
                { error: "Entry point not found" },
                { status: 404 }
            );
        }

        // Verify the user owns the compound of this entry point
        const compound = await firestoreService.compounds.getById(
            entryPoint.compoundId
        );
        if (!compound || compound.adminId !== currentUser.uid) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const updateData = await request.json();
        await firestoreService.update(
            "entryPoints",
            (
                await params
            ).id,
            updateData
        );

        return NextResponse.json({
            success: true,
            message: "Entry point updated successfully",
        });
    } catch (error: unknown) {
        console.error("Update entry point error:", error);
        return NextResponse.json(
            {
                error:
                    (error as Error).message || "Failed to update entry point",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const entryPoint = await firestoreService.read<EntryPoint>(
            "entryPoints",
            (
                await params
            ).id
        );

        if (!entryPoint) {
            return NextResponse.json(
                { error: "Entry point not found" },
                { status: 404 }
            );
        }

        // Verify the user owns the compound of this entry point
        const compound = await firestoreService.compounds.getById(
            entryPoint.compoundId
        );
        if (!compound || compound.adminId !== currentUser.uid) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        await firestoreService.delete("entryPoints", (await params).id);

        return NextResponse.json({
            success: true,
            message: "Entry point deleted successfully",
        });
    } catch (error: unknown) {
        console.error("Delete entry point error:", error);
        return NextResponse.json(
            {
                error:
                    (error as Error).message || "Failed to delete entry point",
            },
            { status: 500 }
        );
    }
}
