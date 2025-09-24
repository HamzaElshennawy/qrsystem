/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
import { getAdminAuth } from "@/firebase/firebaseAdmin";

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const tokenHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!tokenHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded = await getAdminAuth().verifyIdToken(tokenHeader);

        const { token, firstName, lastName } = await request.json();
        if (!token || !firstName || !lastName) {
            return NextResponse.json({ error: "token, firstName, lastName required" }, { status: 400 });
        }

        const invite = await firestoreService.ownerInvites.getByToken(token);
        if (!invite || invite.status !== "pending") {
            return NextResponse.json({ error: "Invalid or used invite" }, { status: 400 });
        }

        // Enforce unique phone: check if phone already used
        const existingByPhone = await firestoreService.users.getByPhone(invite.phone);
        if (existingByPhone.length > 0) {
            return NextResponse.json({ error: "Phone number already in use" }, { status: 400 });
        }

        // Create user record
        await firestoreService.users.create({
            compoundId: invite.compoundId,
            type: "owner",
            firstName,
            lastName,
            email: invite.email || "",
            phone: invite.phone,
            propertyUnit: invite.propertyUnit || "",
            isActive: true,
        } as any);

        // Mark invite accepted
        await firestoreService.ownerInvites.markAccepted(invite.id!, decoded.uid);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Accept invite error:", error);
        return NextResponse.json({ error: error.message || "Failed to accept invite" }, { status: 500 });
    }
}


