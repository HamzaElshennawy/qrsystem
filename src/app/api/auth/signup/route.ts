/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/firebase/auth";

export async function POST(request: NextRequest) {
    try {
        const { email, password, displayName } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        const userCredential = await authService.signUp(
            email,
            password,
            displayName
        );

        return NextResponse.json({
            success: true,
            user: {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
            },
        });
    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: error.message || "Signup failed" },
            { status: 400 }
        );
    }
}
