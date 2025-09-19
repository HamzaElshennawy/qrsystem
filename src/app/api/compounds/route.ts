/* eslint-disable @typescript-eslint/no-unused-vars */
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

        const compounds = await firestoreService.compounds.getByAdmin(
            currentUser.uid
        );

        return NextResponse.json({
            success: true,
            compounds,
        });
    } catch (error: any) {
        console.error("Get compounds error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch compounds" },
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

        const { name, address } = await request.json();

        if (!name || !address) {
            return NextResponse.json(
                { error: "Name and address are required" },
                { status: 400 }
            );
        }

        const compoundData = {
            name,
            address,
            adminId: currentUser.uid,
            adminEmail: currentUser.email || "",
        };

        const compoundId = await firestoreService.compounds.create(
            compoundData
        );

        return NextResponse.json({
            success: true,
            compoundId,
            message: "Compound created successfully",
        });
    } catch (error: any) {
        console.error("Create compound error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create compound" },
            { status: 500 }
        );
    }
}
